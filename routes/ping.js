const express = require("express");
const router = express.Router();

// keep-alive route
router.get("/", (req, res) => {
  res.send("Server is alive ✅");
});

module.exports = router;
