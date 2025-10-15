import express from "express";
import multer from "multer";
import cors from "cors";
import Tesseract from "tesseract.js";
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from "docx";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Pecipic backend is live");
});

app.post("/convert-ai", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;

    // Compress + ensure correct format
    const processedPath = `${imagePath}-processed.png`;
    await sharp(imagePath).resize({ width: 1200, withoutEnlargement: true }).toFile(processedPath);

    const result = await Tesseract.recognize(processedPath, "eng", {
      logger: (m) => console.log(m),
    });

    const extractedText = result.data.text || "No text detected";

    const arrayBuffer = fs.readFileSync(processedPath);
    const paragraphs = [];

    // Add image first
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: arrayBuffer,
            transformation: { width: 500, height: 700 },
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    // Add text below image
    paragraphs.push(
      new Paragraph({
        children: [new TextRun("——— Extracted Text ———")],
        alignment: AlignmentType.CENTER,
      })
    );

    extractedText.split(/\r?\n/).forEach((line) => {
      paragraphs.push(new Paragraph({ children: [new TextRun(line)] }));
    });

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const buffer = await Packer.toBuffer(doc);

    fs.unlinkSync(imagePath);
    fs.unlinkSync(processedPath);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=Pecipic-Converted.docx");
    res.send(buffer);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Conversion failed: " + err.message);
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
