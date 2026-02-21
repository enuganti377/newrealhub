const axios = require("axios");
const xml2js = require("xml2js");
const cheerio = require("cheerio");
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
    text.includes("ఎన్నిక") ||
    text.includes("ప్రభుత్వం")
  ) {
    return "politics";
  }

  
  if (
    text.includes("cricket") ||
    text.includes("ipl") ||
    text.includes("match") ||
    text.includes("football") ||
    text.includes("క్రికెట్")
  ) {
    return "sports";
  }

  
  if (
    text.includes("movie") ||
    text.includes("review") ||
    text.includes("cinema") ||
    text.includes("సినిమా") ||
    text.includes("హీరో") ||
    text.includes("actress")
  ) {
    return "cinema";
  }

  return "general";
}


function cleanDescription(html = "", maxWords = 60) {
  const $ = cheerio.load(html);
  $("img").remove();

  const text = $.text().replace(/\s+/g, " ").trim();
  const words = text.split(" ");

  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}


function extractImage(item) {
  if (item?.content?.$?.url) return item.content.$.url;
  if (item?.["media:content"]?.$?.url) return item["media:content"].$.url;
  if (item?.thumbnail?.$?.url) return item.thumbnail.$.url;
  if (item?.["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
  if (item?.enclosure?.$?.url) return item.enclosure.$.url;

  if (item?.description) {
    const match = item.description.match(
      /<img[^>]+src=['"]([^'"]+)['"]/i
    );
    if (match) return match[1];
  }

  return DEFAULT_IMAGE;
}


const rssFeeds = [
  {
    url: "https://telugu.abplive.com/politics/feed",
    defaultCategory: "politics",
  },
  {
    url: "https://telugu.abplive.com/sports/feed",
    defaultCategory: "sports",
  },
  {
    url: "https://telugu.abplive.com/entertainment/feed",
    defaultCategory: "cinema",
  },
  {
    url: "https://telugu.abplive.com/home/feed",
    defaultCategory: "general",
  },
];


async function fetchTeluguNews() {
  console.log("📡 Fetching ABP Telugu (Smart Categorization)");

  let totalInserted = 0;

  try {
    for (const feed of rssFeeds) {
      const response = await axios.get(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000,
      });

      const parser = new xml2js.Parser({
        explicitArray: false,
        tagNameProcessors: [xml2js.processors.stripPrefix],
      });

      const data = await parser.parseStringPromise(response.data);
      let items = data?.rss?.channel?.item || [];

      if (!Array.isArray(items)) items = [items];

      for (const item of items.slice(0, 20)) {
        if (!item?.link) continue;

        const shortDescription = cleanDescription(
          item.description || "",
          60
        );

        const imageUrl = extractImage(item);

        // Smart category detection
        const detectedCategory = detectCategory(
          item.title || "",
          shortDescription
        );

        
        const finalCategory =
          detectedCategory !== "general"
            ? detectedCategory
            : feed.defaultCategory;

        const result = await News.updateOne(
          {
            externalId: item.link,
            source: "ABP Telugu",
          },
          {
            $set: {
              title: item.title || "No Title",
              description: shortDescription,
              imageUrl,
              link: item.link,
              language: "te",
              source: "ABP Telugu",
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

    console.log(" Total ABP Telugu Inserted:", totalInserted);
    return totalInserted;

  } catch (err) {
    console.error(" ABP Telugu RSS Error:", err.message);
    return 0;
  }
}

module.exports = { fetchTeluguNews };
