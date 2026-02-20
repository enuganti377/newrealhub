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

const DEFAULT_IMAGE =
  "https://via.placeholder.com/300x200?text=News";

/* =========================
   Clean Description
========================= */
function cleanDescription(html = "", maxWords = 60) {
  const $ = cheerio.load(html);
  $("img").remove();

  const text = $.text().replace(/\s+/g, " ").trim();
  const words = text.split(" ");

  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}

/* =========================
   Extract Image
========================= */
function extractImage(item) {
  if (item?.content?.$?.url) return item.content.$.url;
  if (item?.["media:content"]?.$?.url) return item["media:content"].$.url;
  if (item?.thumbnail?.$?.url) return item.thumbnail.$.url;
  if (item?.["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
  if (item?.enclosure?.$?.url) return item.enclosure.$.url;

  if (item?.encoded) {
    const match = item.encoded.match(
      /<img[^>]+src=['"]([^'"]+)['"]/i
    );
    if (match) return match[1];
  }

  if (item?.description) {
    const match = item.description.match(
      /<img[^>]+src=['"]([^'"]+)['"]/i
    );
    if (match) return match[1];
  }

  return DEFAULT_IMAGE;
}

/* =========================
   Fetch Single Category
========================= */
async function fetchCategory(category, url) {
  console.log(`📡 Fetching ABP Telugu: ${category}`);

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });

    const parser = new xml2js.Parser({
      explicitArray: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    const data = await parser.parseStringPromise(response.data);

    let items = data?.rss?.channel?.item || [];

    if (!Array.isArray(items)) {
      items = [items];
    }

    items = items.slice(0, 15);

    let inserted = 0;

    for (const item of items) {
      if (!item?.link) continue;

      const imageUrl = extractImage(item);
      const shortDescription = cleanDescription(
        item.description || "",
        60
      );

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
            category,
            language: "te",
            source: "ABP Telugu",
            publishedAt: item.pubDate
              ? new Date(item.pubDate)
              : new Date(),
          },
          $setOnInsert: {
            externalId: item.link,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        inserted++;
      }
    }

    console.log(` ${category} inserted: ${inserted}`);
    return inserted;

  } catch (err) {
    console.error(`${category} RSS Error:`, err.message);
    return 0;
  }
}

/* =========================
   Fetch ALL Categories
========================= */
async function fetchAllTeluguNews() {
  let total = 0;

  for (const [category, url] of Object.entries(rssMap)) {
    const count = await fetchCategory(category, url);
    total += count;
  }

  console.log(" Total ABP Telugu inserted:", total);
  return total;
}

module.exports = { fetchAllTeluguNews };
