// server.js — Pecipic.ai Backend (Layout Preserving Version)
import express from "express";
import multer from "multer";
import cors from "cors";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// === Route to check API status ===
app.get("/", (req, res) => {
  res.send("✅ Pecipic Backend is Running.");
});

// === Convert endpoint ===
app.post("/convert-ai", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const inputPath = req.file.path;
  const outputPath = inputPath + ".docx";

  try {
    // Run a Python script for OCR + layout
    const command = `python3 convert_layout.py "${inputPath}" "${outputPath}"`;
    exec(command, (error) => {
      fs.unlink(inputPath, () => {});
      if (error) {
        console.error("Python error:", error);
        return res.status(500).json({ error: "Conversion failed" });
      }

      // Send back the Word file
      res.download(outputPath, "Pecipic-Converted.docx", () => {
        fs.unlink(outputPath, () => {});
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Pecipic backend running on port ${PORT}`));
