const axios = require("axios");
const xml2js = require("xml2js");
const cheerio = require("cheerio");
const News = require("../models/News");

const rssMap = {
  general: "https://telugu.abplive.com/home/feed",
  politics: "https://telugu.abplive.com/politics/feed",
  sports: "https://telugu.abplive.com/sports/feed",
  cinema: "https://telugu.abplive.com/entertainment/feed",
};



// Decode HTML entities
function decodeHtml(text = "") {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}



// Clean + limit words
function cleanText(html = "", maxWords = 350) {
  let text = decodeHtml(html);

  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  const words = text.split(" ");
  if (words.length > maxWords) {
    text = words.slice(0, maxWords).join(" ");
  }

  return text;
}



// 🔥 Strong full article extractor
async function extractFullArticle(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 12000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    const $ = cheerio.load(data);

    let text = "";

    // Try multiple containers
    const selectors = [
      ".article-content p",
      ".story-content p",
      ".abp-story-article p",
      "article p",
      ".content p",
      ".storyBody p",
    ];

    for (const sel of selectors) {
      $(sel).each((i, el) => {
        const t = $(el).text().trim();
        if (t.length > 40) {
          text += t + " ";
        }
      });

      if (text.length > 300) break;
    }

    return text.trim();

  } catch {
    return "";
  }
}



// Detect bad images
function isBadImage(url) {
  if (!url) return true;
  const bad = ["logo", "icon", "sprite", "default"];
  return bad.some((w) => url.toLowerCase().includes(w));
}



// Extract image
async function extractArticleImage(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const og = $('meta[property="og:image"]').attr("content");
    if (og && !isBadImage(og)) return og;

    return null;

  } catch {
    return null;
  }
}



// MAIN FETCH
async function fetchTeluguNews(category) {
  const rssUrl = rssMap[category];
  if (!rssUrl) return 0;

  console.log("📡 Fetching ABP:", category);

  const response = await axios.get(rssUrl);
  const parser = new xml2js.Parser({
    explicitArray: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
  });

  const data = await parser.parseStringPromise(response.data);

  const items = data?.rss?.channel?.item || [];
  const list = Array.isArray(items)
    ? items.slice(0, 10)
    : [items];

  let count = 0;

  for (const item of list) {
    try {
      if (!item.link) continue;

      // IMAGE
      let imageUrl =
        item.enclosure?.$?.url ||
        item["media:content"]?.$?.url;

      if (!imageUrl || isBadImage(imageUrl)) {
        imageUrl = await extractArticleImage(item.link);
      }

      // FULL ARTICLE TEXT
      let fullText = await extractFullArticle(item.link);

      if (fullText.length < 150) {
        fullText =
          item["content:encoded"] ||
          item.description ||
          "";
      }

      const cleanDescription = cleanText(
        fullText,
        350
      );

      await News.updateOne(
        { externalId: item.link },
        {
          $set: {
            description: cleanDescription,
            imageUrl:
              imageUrl ||
              "https://via.placeholder.com/300x200?text=News",
          },
          $setOnInsert: {
            title: item.title,
            link: item.link,
            category,
            language: "te",
            source: "ABN Telugu",
            externalId: item.link,
            publishedAt: new Date(item.pubDate),
          },
        },
        { upsert: true }
      );

      count++;

    } catch {
      console.log("⚠ Skip:", item.link);
    }
  }

  console.log(`📰 ABP ${category} saved:`, count);
  return count;
}

module.exports = { fetchTeluguNews };
