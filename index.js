// index.js - Pecipic backend (Express + multer + tesseract.js + docx)
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { createWorker } = require("tesseract.js");
const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } = require("docx");

const app = express();
app.use(cors({ origin: "*" })); // later restrict to your GH pages domain if you want

// Multer memory storage so we have file buffer in memory
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } }); // 12MB max

// Health
app.get("/", (req, res) => res.send("Pecipic backend - ready"));

// /convert endpoint: multipart form upload field name "file"
app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded (use 'file' field)." });
    const buffer = req.file.buffer;
    const filename = (req.file.originalname || "upload").replace(/\s+/g, "_");

    // Initialize tesseract worker
    const worker = createWorker({
      // Optional: logger: m => console.log(m)
    });

    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // Recognize text from the image buffer
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();

    // Build a DOCX with the original image embedded and OCR text below
    const paragraphs = [];

    // Add image (embedded from buffer)
    try {
      const imageRun = new ImageRun({
        data: buffer,
        transformation: { width: 600 }, // width in px; docx will scale
      });

      paragraphs.push(
        new Paragraph({
          children: [imageRun],
          alignment: AlignmentType.CENTER,
        })
      );
    } catch (imgErr) {
      // image embedding failed; continue without image
      console.error("Image embedding failed:", imgErr);
    }

    // Separator
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: "——— Extracted Text ———", bold: true })],
        alignment: AlignmentType.CENTER,
      })
    );

    // Add OCR text lines
    if (text && text.trim().length > 0) {
      const lines = text.replace(/\r/g, "").split(/\n/);
      for (const line of lines) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line })],
          })
        );
      }
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "No text detected." })],
        })
      );
    }

    // Footer credit
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: "\nConverted by Pecipic.ai", italics: true })],
        alignment: AlignmentType.RIGHT,
      })
    );

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const bufferDoc = await Packer.toBuffer(doc);

    // Send as attachment
    res.set({
      "Content-Disposition": `attachment; filename="${filename}.docx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    return res.send(bufferDoc);
  } catch (err) {
    console.error("Conversion error:", err);
    return res.status(500).json({ error: "Conversion failed", details: err.message });
  }
});

// Start server (Render provides PORT env variable)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pecipic backend listening on port ${PORT}`));
