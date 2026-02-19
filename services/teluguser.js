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

// ✅ Strong RSS Image Extractor (NO webpage scraping)
function extractImage(item) {

  // 1️⃣ media:content (after stripPrefix)
  if (item.content?.$?.url) {
    return item.content.$.url;
  }

  if (item["media:content"]?.$?.url) {
    return item["media:content"].$.url;
  }

  // 2️⃣ media:thumbnail
  if (item.thumbnail?.$?.url) {
    return item.thumbnail.$.url;
  }

  if (item["media:thumbnail"]?.$?.url) {
    return item["media:thumbnail"].$.url;
  }

  // 3️⃣ enclosure
  if (item.enclosure?.$?.url) {
    return item.enclosure.$.url;
  }

  // 4️⃣ content:encoded image
  if (item.encoded) {
    const match = item.encoded.match(
      /<img[^>]+src=['"]([^'"]+)['"]/i
    );
    if (match) return match[1];
  }

  // 5️⃣ description image
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

      const imageUrl = extractImage(item);
      const shortDescription = cleanDescription(
        item.description || "",
        60
      );

      await News.updateOne(
        { externalId: item.link },
        {
          $set: {
            description: shortDescription,
            imageUrl,
          },
          $setOnInsert: {
            title: item.title,
            link: item.link, // redirect only
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

    console.log(`Saved ${count} ${category} news`);
    return count;

  } catch (err) {
    console.log("RSS Error:", err.message);
    return 0;
  }
}

module.exports = { fetchTeluguNews };

