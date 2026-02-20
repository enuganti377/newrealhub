const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const rssMap = {
  general: "https://ntvtelugu.com/feed",
  politics: "https://ntvtelugu.com/category/politics/feed",
  sports: "https://ntvtelugu.com/category/sports/feed",
  cinema: "https://ntvtelugu.com/category/entertainment/feed",
};

function extractImageFromHTML(html) {
  if (!html) return null;

  const regex = /<img[^>]+(?:src|data-src)=['"]([^'"]+)['"]/i;
  const match = html.match(regex);

  return match ? match[1] : null;
}

function cleanDescription(description = "") {
  return description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchNTV(category) {
  const rssurl = rssMap[category];
  if (!rssurl) return 0;

  console.log("📡 Fetching NTV:", category);

  try {
    const response = await axios.get(rssurl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(response.data);

    let items = data?.rss?.channel?.item || [];

    // 🔥 FIX: Always ensure array
    if (!Array.isArray(items)) {
      items = [items];
    }

    console.log(` NTV ${category} total from RSS:`, items.length);

    items = items.slice(0, 10);

    let count = 0;

    for (const item of items) {
      try {
        if (!item?.link) continue;

        // 🔥 Better duplicate check (include source)
        const exists = await News.findOne({
          externalId: item.link,
          source: "NTV Telugu",
        });

        if (exists) continue;

        let imageUrl = null;

        // Try description first
        imageUrl = extractImageFromHTML(item.description);

        // Try content:encoded
        if (!imageUrl && item["content:encoded"]) {
          imageUrl = extractImageFromHTML(item["content:encoded"]);
        }

        // Try media:content
        if (!imageUrl && item["media:content"]?.$?.url) {
          imageUrl = item["media:content"].$.url;
        }

        // Try enclosure
        if (!imageUrl && item.enclosure?.$?.url) {
          imageUrl = item.enclosure.$.url;
        }

        await News.create({
          title: item.title || "No Title",
          description: cleanDescription(item.description || ""),
          imageUrl:
            imageUrl || "https://yourcdn.com/default-news.jpg",
          link: item.link,
          category,
          language: "te",
          source: "NTV Telugu",
          externalId: item.link,
          publishedAt: item.pubDate
            ? new Date(item.pubDate)
            : new Date(),
        });

        count++;
      } catch (itemErr) {
        console.error(" NTV item error:", itemErr.message);
      }
    }

    console.log(` NTV ${category} saved: ${count}`);
    return count;
  } catch (error) {
    console.error(" NTV RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchNTV };
