const axios = require("axios");
const xml2js = require("xml2js");
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

// Clean HTML + limit words
function cleanText(html = "", maxWords = 250) {
  let text = decodeHtml(html);

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  const words = text.split(" ");
  if (words.length > maxWords) {
    text = words.slice(0, maxWords).join(" ") + "...";
  }

  return text;
}

async function fetchTeluguNews(category) {
  const rssUrl = rssMap[category];
  if (!rssUrl) return 0;

  console.log("Fetching RSS:", category);

  try {
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
      if (!item.link) continue;

      // Get image ONLY from RSS
      let imageUrl =
        item.enclosure?.$?.url ||
        item["media:content"]?.$?.url ||
        "https://via.placeholder.com/300x200?text=News";

      // Use ONLY RSS description/content
      let description =
        item["content:encoded"] ||
        item.description ||
        "";

      const cleanDescription = cleanText(description, 250);

      await News.updateOne(
        { externalId: item.link },
        {
          $set: {
            description: cleanDescription,
            imageUrl: imageUrl,
          },
          $setOnInsert: {
            title: item.title,
            link: item.link,
            category,
            language: "te",
            source: "ABP Telugu",
            externalId: item.link,
            publishedAt: new Date(item.pubDate),
          },
        },
        { upsert: true }
      );

      count++;
    }

    console.log(`Saved ${category}:`, count);
    return count;

  } catch (error) {
    console.error("RSS fetch error:", error.message);
    return 0;
  }
}

module.exports = { fetchTeluguNews };
