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


async function fetchNTV(category) {
  const rssurl = rssMap[category];
  if (!rssurl) return 0;

  console.log("📡 Fetching NTV:", category);

  try {
    const response = await axios.get(rssurl, { timeout: 10000 });

    const parser = new xml2js.Parser({ explicitArray: false });
    const data = await parser.parseStringPromise(response.data);

    const items = data?.rss?.channel?.item || [];
    const newsItems = Array.isArray(items) ? items.slice(0, 10) : [items];

    let count = 0;

    for (const item of newsItems) {
      try {
        
        const exists = await News.findOne({ externalId: item.link });
        if (exists) continue;

       
        let imageUrl = null;

 
        imageUrl = extractImageFromHTML(item.description);

    
        if (!imageUrl && item["content:encoded"]) {
          imageUrl = extractImageFromHTML(item["content:encoded"]);
        }

        
        if (!imageUrl && item["media:content"]?.$?.url) {
          imageUrl = item["media:content"].$.url;
        }

       
        if (!imageUrl && item.enclosure?.$?.url) {
          imageUrl = item.enclosure.$.url;
        }

        await News.create({
          title: item.title,
          description: item.description,
          imageUrl: imageUrl || "https://yourcdn.com/default-news.jpg",
          link: item.link,
          category,
          language: "te",
          source: "NTV Telugu",
          externalId: item.link,
          publishedAt: new Date(item.pubDate),
        });

        count++;

      } catch (itemErr) {
        console.error(" NTV item error:", itemErr.message);
      }
    }

    console.log(`NTV ${category} saved: ${count}`);
    return count;

  } catch (error) {
    console.error("NTV RSS ERROR:", error.message);
    return 0;
  }
}

module.exports = { fetchNTV };
