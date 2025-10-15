// Pecipic.ai Backend (Render Ready)
// Converts uploaded image → Word (.docx)

import express from "express";
import cors from "cors";
import multer from "multer";
import { createRequire } from "module";
import fs from "fs";
import { Document, Packer, Paragraph, ImageRun, TextRun, AlignmentType } from "docx";
import Tesseract from "tesseract.js";

const require = createRequire(import.meta.url);
const app = express();
app.use(cors());
app.use(express.json());

// Setup file upload temp storage
const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("✅ Pecipic.ai Backend is Running!");
});

// OCR + Word creation endpoint
app.post("/convert", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");

    const imgPath = req.file.path;
    console.log("🔍 OCR Processing:", imgPath);

    // Step 1: Perform OCR with Tesseract
    const result = await Tesseract.recognize(imgPath, "eng");
    const text = result.data.text.trim() || "No text detected";

    // Step 2: Build Word document
    const imageBuffer = fs.readFileSync(imgPath);
    const paragraphs = [
      new Paragraph({
        children: [
          new ImageRun({
            data: imageBuffer,
            transformation: { width: 600, height: 800 },
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: "——— Extracted Text ———", bold: true })],
        alignment: AlignmentType.CENTER,
      }),
      ...text.split(/\r?\n/).map(line => new Paragraph({ children: [new TextRun(line)] })),
      new Paragraph({
        children: [new TextRun({ text: "\nConverted by Pecipic.ai", italics: true, size: 20 })],
        alignment: AlignmentType.RIGHT,
      }),
    ];

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=converted.docx");
    res.send(buffer);

    fs.unlinkSync(imgPath);
  } catch (err) {
    console.error("❌ Conversion Error:", err);
    res.status(500).send("Server error during conversion");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

import { execFile } from "child_process";
import path from "path";

app.post("/convert-ai", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded");
    const imgPath = req.file.path;

    const pyScript = path.resolve("./python/layout_ocr.py");

    execFile("python3", [pyScript, imgPath], { maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        return res.status(500).send("AI OCR failed");
      }

      const text = stdout.trim() || "No text found";

      // Build DOCX with layout-aware text blocks
      const { Document, Packer, Paragraph, TextRun } = require("docx");
      const doc = new Document({
        sections: [
          {
            children: text.split("\n\n").map(block =>
              new Paragraph({
                children: [new TextRun(block)],
              })
            ),
          },
        ],
      });

      Packer.toBuffer(doc).then(buffer => {
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", "attachment; filename=AI-Layout.docx");
        res.send(buffer);
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("AI layout conversion error");
  }
});
                                
