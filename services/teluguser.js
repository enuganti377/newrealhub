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

// ✅ Clean HTML safely (ONLY from RSS description)
function cleanDescription(html = "", maxWords = 60) {
  const $ = cheerio.load(html);

  // Remove image tags from description
  $("img").remove();

  const text = $.text().replace(/\s+/g, " ").trim();
  const words = text.split(" ");

  if (words.length > maxWords) {
    return words.slice(0, maxWords).join(" ") + "...";
  }

  return text;
}

// ✅ Extract image ONLY from RSS data
function extractImage(item) {
  // 1️⃣ enclosure tag
  if (item.enclosure?.$?.url) {
    return item.enclosure.$.url;
  }

  // 2️⃣ media:content
  if (item["media:content"]?.$?.url) {
    return item["media:content"].$.url;
  }

  // 3️⃣ image inside description HTML
  if (item.description) {
    const $ = cheerio.load(item.description);
    const img = $("img").attr("src");
    if (img) return img;
  }

  return "https://via.placeholder.com/300x200?text=News";
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
        60 // only preview
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
            link: item.link, // redirect to original site
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
    console.log("Error fetching RSS:", err.message);
    return 0;
  }
}

module.exports = { fetchTeluguNews };
