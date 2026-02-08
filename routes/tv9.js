const express = require("express");
const router = express.Router();

const { TV9News } = require("../controllers/TV9controller");
const { fetchTV9 } = require("../services/TV9"); 


// Get news
router.get("/TV9", TV9News);


// Cron fetch route
router.get("/fetch", async (req, res) => {
  try {
    await fetchTV9();

    res.send("✅ TV9 news fetched");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching TV9 news");
  }
});

module.exports = router;
