const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const DEFAULT_IMAGE =
  "https://via.placeholder.com/300x200?text=News";


function detectCategory(title = "", description = "") {
  const text = (title + " " + description).toLowerCase();

  if (
    text.includes("cm") ||
    text.includes("mla") ||
    text.includes("minister") ||
    text.includes("election") ||
    text.includes("మంత్రి") ||
    text.includes("ఎన్నిక")
  ) {
    return "politics";
  }

  if (
    text.includes("cricket") ||
    text.includes("ipl") ||
    text.includes("match") ||
    text.includes("క్రికెట్")
  ) {
    return "sports";
  }

  if (
    text.includes("movie") ||
    text.includes("review") ||
    text.includes("cinema") ||
    text.includes("సినిమా") ||
    text.includes("హీరో")
  ) {
    return "cinema";
  }

  return "general";
}


const rssFeeds = [
  {
    url: "https://ntvtelugu.com/category/politics/feed",
    defaultCategory: "politics",
  },
  {
    url: "https://ntvtelugu.com/category/sports/feed",
    defaultCategory: "sports",
  },
  {
    url: "https://ntvtelugu.com/category/entertainment/feed",
    defaultCategory: "cinema",
  },
  {
    url: "https://ntvtelugu.com/feed",
    defaultCategory: "general",
  },
];

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


async function fetchNTV() {
  console.log(" Fetching NTV (Hybrid Mode)");

  let totalInserted = 0;

  try {
    for (const feed of rssFeeds) {
      const response = await axios.get(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000,
      });

      const parser = new xml2js.Parser({
        explicitArray: false,
      });

      const data = await parser.parseStringPromise(response.data);
      let items = data?.rss?.channel?.item || [];

      if (!Array.isArray(items)) items = [items];

      for (const item of items.slice(0, 20)) {
        if (!item?.link) continue;

        const description = cleanDescription(item.description || "");

        const detected = detectCategory(
          item.title || "",
          description
        );

        const finalCategory =
          detected !== "general"
            ? detected
            : feed.defaultCategory;

        let imageUrl =
          extractImageFromHTML(item.description) ||
          extractImageFromHTML(item["content:encoded"]) ||
          item["media:content"]?.$?.url ||
          item.enclosure?.$?.url ||
          DEFAULT_IMAGE;

        const result = await News.updateOne(
          {
            externalId: item.link,
            source: "NTV Telugu",
          },
          {
            $set: {
              title: item.title || "No Title",
              description,
              imageUrl,
              link: item.link,
              language: "te",
              source: "NTV Telugu",
              publishedAt: item.pubDate
                ? new Date(item.pubDate)
                : new Date(),
            },
            $setOnInsert: {
              externalId: item.link,
              category: finalCategory,
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          totalInserted++;
        }
      }
    }

    console.log(" NTV Inserted:", totalInserted);
    return totalInserted;

  } catch (error) {
    console.error(" NTV RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchNTV };
