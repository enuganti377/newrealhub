const cron = require("node-cron");
const { fetchTV9 } = require("../services/TV9");



console.log("TV9 RSS cron started");

cron.schedule("*/9 * * * *", async () => {
  try {
    const categories = ["general", "politics", "sports", "cinema"];

    for (const cat of categories) {
      await fetchTV9(cat);
    }

    console.log("Cron fetch done");
  } catch (err) {
    console.error("Cron error:", err.message);
  }
});