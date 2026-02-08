const cron = require("node-cron");
const { fetchEnglishNews } = require("../services/english");

let isRunning = false;

console.log(" English RSS cron started");


cron.schedule("*/1 * * * *", async () => {
  if (isRunning) {
    console.log(" English Cron skipped (already running)");
    return;
  }

  isRunning = true;

  try {
    console.log(" English Cron Started");

    const count = await fetchEnglishNews();

    console.log(` English Cron Done. Saved: ${count}`);
  } catch (err) {
    console.error(" English Cron error:", err.message);
  } finally {
    isRunning = false;
  }
});
