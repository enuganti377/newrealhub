const cron = require("node-cron");
const { fetchTeluguNews } = require("../services/teluguser");

console.log("Telugu RSS cron started");

// Run every 10 minutes (better than every 1 min)

cron.schedule("*/20 * * * *", async () => {


  console.log("⏰ Cron running...");

  try {
    await fetchTeluguNews();

    const categories = ["general", "politics", "sports", "cinema"];
    for (const cat of categories) {
      await fetchTeluguNews(cat);
    }
     console.log("Cron fetch done");

  } catch (err) {
    console.error(" Cron error:", err.message);
  }
});
