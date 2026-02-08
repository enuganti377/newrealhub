const express = require("express");

const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());


const { connectDB } = require("./config/db");


connectDB();


const newsRoutes = require("./routes/news");
const englishRoutes = require("./routes/english.cron");
const teluguRoutes = require("./routes/telugu");
const teluguTV9Routes = require("./routes/tv9");
const NTVRoutes = require("./routes/ntv");
const jobRoutes = require("./routes/jobnews");
const catRoutes = require("./routes/cat");

const pingRoutes  = require("./routes/ping");




app.use("/api/add", newsRoutes);
app.use("/api/english",englishRoutes);
app.use("/api/telugu",teluguRoutes);
app.use("/api/tv9",teluguTV9Routes);
app.use("/api/ntv",NTVRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/cat",catRoutes);
app.use("/api/ping",pingRoutes );






require("./cron/Telugu.cron");
require("./cron/TV9.cron");
require("./cron/NTV.cron");
require("./cron/job.cron");
require("./cron/english.cron");


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
