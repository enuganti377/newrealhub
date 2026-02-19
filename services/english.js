const axios = require("axios");
const xml2js = require("xml2js");
const cheerio = require("cheerio");
const News = require("../models/News");



// Clean text
function cleanText(text = "", maxWords = 250) {
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  const words = text.split(" ");
  if (words.length > maxWords) {
    text = words.slice(0, maxWords).join(" ");
  }

  return text;
}



// Detect bad images
function isBadImage(url) {
  if (!url) return true;
  const bad = ["logo", "icon", "sprite"];
  return bad.some(w => url.toLowerCase().includes(w));
}



// Get image from RSS
function getBBCImageFromRSS(item) {
  if (item["media:thumbnail"]?.$?.url) {
    return item["media:thumbnail"].$.url;
  }

  if (item["media:content"]?.$?.url) {
    return item["media:content"].$.url;
  }

  return null;
}



// 🔥 Extract FULL BBC article text
async function extractBBCFullText(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 12000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(data);

    let text = "";

    // BBC paragraphs
    $("article p").each((i, el) => {
      const t = $(el).text().trim();

      if (t.length > 40) {
        text += t + " ";
      }
    });

    return text.trim();

  } catch {
    return "";
  }
}



// Extract BBC article image
async function extractBBCArticleImage(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && !isBadImage(ogImage)) return ogImage;

    return null;

  } catch {
    return null;
  }
}



async function fetchEnglishNews() {
  console.log("📡 Fetching BBC English News");

  try {
    const response = await axios.get(
      "https://feeds.bbci.co.uk/news/rss.xml"
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(response.data);

    const items = data?.rss?.channel?.item || [];

    let count = 0;

    for (const item of items.slice(0, 10)) {
      try {
        if (!item.link) continue;

        // 🖼 IMAGE
        let imageUrl = getBBCImageFromRSS(item);

        if (!imageUrl) {
          imageUrl = await extractBBCArticleImage(item.link);
        }

        // 📰 FULL TEXT
        let fullText = await extractBBCFullText(item.link);

        // fallback to RSS teaser
        if (fullText.length < 150) {
          fullText = item.description || "";
        }

        const cleanDescription = cleanText(fullText, 250);

        const result = await News.updateOne(
          { externalId: item.link },
          {
            $set: {
              title: item.title,
              description: cleanDescription,
              imageUrl: imageUrl || null,
              link: item.link,
              category: "general",
              language: "en",
              source: "BBC",
              publishedAt: new Date(item.pubDate || Date.now()),
            },
            $setOnInsert: {
              externalId: item.link,
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) count++;

      } catch (err) {
        console.log("⚠ Skip BBC:", item.link);
      }
    }

    console.log(`📰 BBC saved: ${count}`);
    return count;

  } catch (error) {
    console.error("❌ BBC RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchEnglishNews };
