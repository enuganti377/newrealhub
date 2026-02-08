const { fetchEnglishNews } = require("../services/english");

const EnglishNews = async (req, res) => {
  try {
    const count = await fetchEnglishNews();

    res.status(200).json({
      success: true,
      message: `${count} English news fetched successfully`,
    });
  } catch (error) {
    console.error("news not fetched", error.message);
    res.status(500).json({
      success: false,
      message: "RSS fetch failed",
    });
  }
};

module.exports = { EnglishNews };
