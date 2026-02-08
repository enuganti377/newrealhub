

const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
     title: String,
  description: String,
  imageUrl: String,
  link: String,
  category: String,
  language: { type: String, enum: ["en", "te"] },
  source: String,
  publishedAt: Date,
  externalId: { type: String,
     unique: true 
   }
  }
);

module.exports = mongoose.model("News", newsSchema);


