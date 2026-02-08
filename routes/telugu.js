
const express = require("express");
const router = express.Router();

const { TeluguNews } = require("../controllers/telugu");
const { fetchTeluguNews } = require("../services/teluguser");

// get news
router.get("/telugu", TeluguNews);

// cron fetch route
router.get("/fetch", async (req, res) => {
  try {
    const categories = [
      "general",
      "politics",
      "cinema",
      "sports",
    ];

    for (const cat of categories) {
      await fetchTeluguNews(cat);
    }

    res.send("✅ Telugu news fetched");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching Telugu news");
  }
});

module.exports = router;
