const express = require("express");
const router = express.Router();

const { JobsNEWS } = require("../controllers/jobcontroller");
const { fetchJobs } = require("../services/job"); // ✅ IMPORT


// Get jobs
router.get("/job", JobsNEWS);


// Cron fetch route
router.get("/fetch", async (req, res) => {
  try {
    await fetchJobs();

    res.send("✅ Job news fetched");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching job news");
  }
});

module.exports = router;
