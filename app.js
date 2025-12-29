import express from "express";
import cors from "cors";
import Dramabox from "./Dramabox.js";

const app = express();
app.use(express.json());
app.use(cors());

// ==============================
//   BASE API CHECK
// ==============================
app.get("/", (req, res) => {
  res.json({ status: true, message: "Dramabox Node API is running 👍" });
});

// ==============================
//   GET DRAMA DETAIL
// ==============================
app.get("/api/detail/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const data = await Dramabox.getDramaDetail(bookId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

// ==============================
//   GET CHAPTER LIST
// ==============================
app.get("/api/chapters/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const eps = req.query.eps || 0;

    const data = await Dramabox.getChapters(bookId, 720, eps);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

// ==============================
//   BATCH DOWNLOAD
// ==============================
app.post("/api/batch", async (req, res) => {
  try {
    const { bookId, chapterIdList } = req.body;

    const data = await Dramabox.batchDownload(bookId, chapterIdList);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

// ==============================
//   SEARCH DRAMA
// ==============================
app.get("/api/search", async (req, res) => {
  try {
    const keyword = req.query.q || "";
    const page = req.query.page || 1;

    const data = await Dramabox.searchDrama(keyword, page);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

// ==============================
//   GET RECOMMENDED
// ==============================
app.get("/api/recommend", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const data = await Dramabox.getRecommendedBooks(page);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

// ==============================
//   GET BOOK BY FILTER
// ==============================
app.post("/api/filter", async (req, res) => {
  try {
    const filters = req.body.filters || {};
    const page = req.body.page || 1;

    const data = await Dramabox.getBookFromFilter(page, 20, filters);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

// ==============================
//   SERVER START
// ==============================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Dramabox Node API running on http://localhost:${PORT}`);
});
