const express = require("express");
const router = express.Router();

const { EnglishNews } = require("../controllers/english");
const { fetchEnglishNews } = require("../services/english"); 


// Route to get news
router.get("/english", EnglishNews);


// Route for cron-job to fetch news
router.get("/fetch", async (req, res) => {
  try {
    await fetchEnglishNews();

    res.send("✅ English news fetched");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching English news");
  }
});

module.exports = router;
