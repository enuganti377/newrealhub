const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const rssMap = {
  general: "https://tv9telugu.com/feed",
  politics: "https://tv9telugu.com/politics/feed",
  sports: "https://tv9telugu.com/sports/feed",
  cinema: "https://tv9telugu.com/entertainment/feed",
};

function extractImage(item) {
  let imageUrl = null;

  // media:content
  if (item["media:content"]?.$?.url) {
    imageUrl = item["media:content"].$.url;
  }

  // enclosure
  else if (item.enclosure?.$?.url) {
    imageUrl = item.enclosure.$.url;
  }

  // content:encoded
  else if (item["content:encoded"]) {
    const match = item["content:encoded"].match(
      /<img[^>]+src="([^">]+)"/
    );
    if (match) imageUrl = match[1];
  }

  // description
  else if (item.description) {
    const match = item.description.match(
      /<img[^>]+src="([^">]+)"/
    );
    if (match) imageUrl = match[1];
  }

  return imageUrl;
}

function cleanDescription(description = "") {
  return description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTV9(category) {
  const rssurl = rssMap[category];
  if (!rssurl) return 0;

  console.log("📡 Fetching TV9:", category);

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

    
    if (!Array.isArray(items)) {
      items = [items];
    }

    console.log(` TV9 ${category} total from RSS:`, items.length);

    items = items.slice(0, 10); // Take latest 10

    let count = 0;

    for (const item of items) {
      try {
        if (!item?.link) continue;

        const exists = await News.findOne({
          externalId: item.link,
          source: "TV9 Telugu",
        });

        if (exists) continue;

        const imageUrl = extractImage(item);

        await News.create({
          title: item.title || "No Title",
          description: cleanDescription(item.description || ""),
          imageUrl,
          link: item.link,
          category,
          language: "te",
          source: "TV9 Telugu",
          externalId: item.link,
          publishedAt: item.pubDate
            ? new Date(item.pubDate)
            : new Date(),
        });

        count++;
      } catch (err) {
        console.error("❌ TV9 Item Error:", err.message);
      }
    }

    console.log(` TV9 ${category} saved:`, count);
    return count;
  } catch (error) {
    console.error(" TV9 RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchTV9 };
