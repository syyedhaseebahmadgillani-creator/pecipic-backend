import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// === New endpoint for AI-enhanced image-to-docx conversion ===
app.post("/convert-ai", upload.single("image"), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = `${__dirname}/output/${Date.now()}_converted.docx`;

    // Run Python helper script
    const python = spawn("python3", ["converter_ai.py", inputPath, outputPath]);

    python.on("close", (code) => {
      if (code === 0) {
        res.download(outputPath, "Pecipic_Converted.docx", (err) => {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        });
      } else {
        res.status(500).send("Conversion failed");
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Pecipic backend running on port ${PORT}`));
