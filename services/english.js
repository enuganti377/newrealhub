const axios = require("axios");
const xml2js = require("xml2js");
const News = require("../models/News");

const DEFAULT_IMAGE =
  "https://via.placeholder.com/300x200?text=News";


function cleanText(text = "", maxWords = 60) {
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  const words = text.split(" ");
  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "..."
    : text;
}


function getBBCImage(item) {
  if (item?.thumbnail?.$?.url) return item.thumbnail.$.url;
  if (item?.content?.$?.url) return item.content.$.url;
  if (item?.enclosure?.$?.url) return item.enclosure.$.url;

  return DEFAULT_IMAGE;
}


const feeds = [
  {
    url: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    category: "political",
  },
  {
    url: "https://feeds.bbci.co.uk/sport/rss.xml",
    category: "sports",
  },
  {
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    category: "cinema",
  },
  {
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    category: "general",
  },
];


async function fetchEnglishNews() {
  console.log(" Fetching BBC News (Priority Category Order)");

  let totalInserted = 0;

  try {
    for (const feed of feeds) {
      console.log(`➡ Fetching ${feed.category}`);

      const response = await axios.get(feed.url);

      const parser = new xml2js.Parser({
        explicitArray: false,
        tagNameProcessors: [xml2js.processors.stripPrefix],
      });

      const data = await parser.parseStringPromise(response.data);
      let items = data?.rss?.channel?.item || [];

      if (!Array.isArray(items)) items = [items];

      for (const item of items.slice(0, 15)) {
        if (!item.link) continue;

        const imageUrl = getBBCImage(item);
        const description = cleanText(item.description || "", 60);

        const result = await News.updateOne(
          { externalId: item.link },
          {
            // Always update content fields
            $set: {
              title: item.title,
              description,
              imageUrl,
              link: item.link,
              language: "en",
              source: "BBC",
              publishedAt: new Date(item.pubDate || Date.now()),
            },

          
            $setOnInsert: {
              externalId: item.link,
              category: feed.category,
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          totalInserted++;
        }
      }
    }

    console.log(`BBC Newly Inserted: ${totalInserted}`);
    return totalInserted;

  } catch (error) {
    console.error(" BBC RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchEnglishNews };
