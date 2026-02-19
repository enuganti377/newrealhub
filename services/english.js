const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const DEFAULT_IMAGE =
  "https://via.placeholder.com/300x200?text=News";

// ✅ Clean description (RSS only)
function cleanText(text = "", maxWords = 60) {
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  const words = text.split(" ");

  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}

// ✅ Extract image from RSS only
function getBBCImage(item) {
  if (item["media:thumbnail"]?.$?.url) {
    return item["media:thumbnail"].$.url;
  }

  if (item["media:content"]?.$?.url) {
    return item["media:content"].$.url;
  }

  if (item.enclosure?.$?.url) {
    return item.enclosure.$.url;
  }

  return DEFAULT_IMAGE;
}

async function fetchEnglishNews() {
  console.log("📡 Fetching BBC English News");

  try {
    const response = await axios.get(
      "https://feeds.bbci.co.uk/news/rss.xml"
    );

    const parser = new xml2js.Parser({
      explicitArray: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    const data = await parser.parseStringPromise(response.data);

    const items = data?.rss?.channel?.item || [];
    let count = 0;

    for (const item of items.slice(0, 10)) {
      if (!item.link) continue;

      const imageUrl = getBBCImage(item);

      const description = cleanText(
        item.description || "",
        60
      );

      await News.updateOne(
        { externalId: item.link },
        {
          $set: {
            title: item.title,
            description,
            imageUrl,
            link: item.link, // redirect only
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

      count++;
    }

    console.log(`📰 BBC saved: ${count}`);
    return count;

  } catch (error) {
    console.error("❌ BBC RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchEnglishNews };

