const cron = require("node-cron");
const { fetchNTV} = require("../services/NTV");



console.log("NTV RSS cron started");

cron.schedule("*/15 * * * *", async () => {
  try {
    const categories = ["general", "politics", "sports", "cinema"];

    for (const cat of categories) {
      await fetchNTV(cat);
    }

    console.log("Cron fetch done");
  } catch (err) {
    console.error("Cron error:", err.message);
  }
});