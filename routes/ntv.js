const express = require("express");
const router = express.Router();

const { NTVNews } = require("../controllers/NTVcontroller");
const { fetchNTV } = require("../services/NTV"); // ✅ IMPORT


// Get news
router.get("/NTV", NTVNews);


// Cron fetch route
router.get("/fetch", async (req, res) => {
  try {
    await fetchNTV();

    res.send("✅ NTV news fetched");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching NTV news");
  }
});

module.exports = router;
