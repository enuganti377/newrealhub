const cron = require("node-cron");
const { fetchTeluguNews } = require("../services/teluguser");

c

console.log("Telugu RSS cron started");

// Run every 20 minutes
cron.schedule("*/20 * * * *", async () => {
  console.log(" Cron running...");

  try {
    await fetchTeluguNews ();
    console.log("Cron fetch done");
  } catch (err) {
    console.error(" Cron error:", err.message);
  }
});
