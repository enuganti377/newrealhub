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

// ✅ Clean description safely (RSS only)
function cleanDescription(html = "", maxWords = 60) {
  const $ = cheerio.load(html);
  $("img").remove();

  const text = $.text().replace(/\s+/g, " ").trim();
  const words = text.split(" ");

  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}

// ✅ SAME IMAGE LOGIC (UNCHANGED)
function extractImage(item) {
  if (item.content?.$?.url) {
    return item.content.$.url;
  }

  if (item["media:content"]?.$?.url) {
    return item["media:content"].$.url;
  }

  if (item.thumbnail?.$?.url) {
    return item.thumbnail.$.url;
  }

  if (item["media:thumbnail"]?.$?.url) {
    return item["media:thumbnail"].$.url;
  }

  if (item.enclosure?.$?.url) {
    return item.enclosure.$.url;
  }

  if (item.encoded) {
    const match = item.encoded.match(
      /<img[^>]+src=['"]([^'"]+)['"]/i
    );
    if (match) return match[1];
  }

  if (item.description) {
    const match = item.description.match(
      /<img[^>]+src=['"]([^'"]+)['"]/i
    );
    if (match) return match[1];
  }

  return DEFAULT_IMAGE;
}

async function fetchTeluguNews(category) {
  const rssUrl = rssMap[category];
  if (!rssUrl) return 0;

  console.log("📡 Fetching ABP Telugu:", category);

  try {
    const response = await axios.get(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const parser = new xml2js.Parser({
      explicitArray: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    const data = await parser.parseStringPromise(response.data);

    let items = data?.rss?.channel?.item || [];

    // 🔥 FIX: Ensure always array
    if (!Array.isArray(items)) {
      items = [items];
    }

    console.log(`📰 ABP ${category} total from RSS:`, items.length);

    items = items.slice(0, 10);

    let count = 0;

    for (const item of items) {
      try {
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
              description: shortDescription,
              imageUrl,
            },
            $setOnInsert: {
              title: item.title || "No Title",
              link: item.link,
              category,
              language: "te",
              source: "ABP Telugu",
              externalId: item.link,
              publishedAt: item.pubDate
                ? new Date(item.pubDate)
                : new Date(),
            },
          },
          { upsert: true }
        );

        // 🔥 Only count if actually inserted
        if (result.upsertedCount > 0) {
          count++;
        }

      } catch (itemErr) {
        console.error(" ABP item error:", itemErr.message);
      }
    }

    console.log(` ABP ${category} newly inserted: ${count}`);
    return count;

  } catch (err) {
    console.log(" ABP RSS Error:", err.message);
    return 0;
  }
}

module.exports = { fetchTeluguNews };

