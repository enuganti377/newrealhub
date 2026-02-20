const express = require("express");
const router = express.Router();
const News = require("../models/News");

router.get("/", async (req, res) => {
  try {
    const category = req.query.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    if (!category) {
      return res.status(400).json({ message: "category is required" });
    }

    const news = await News.find({ category })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)  
      .limit(limit);

    res.json(news);

  } catch (err) {
    console.log("Pagination error:", err);
    res.status(500).json({ message: "server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({ message: "News not found" });
    }

    res.json(news);

  } catch (err) {
    console.log("Single news error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

