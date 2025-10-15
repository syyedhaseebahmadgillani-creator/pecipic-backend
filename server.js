// server.js - Pecipic backend (Node) that calls Python layout script
import express from "express";
import cors from "cors";
import multer from "multer";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// Multer store to uploads/ folder
const upload = multer({ dest: "uploads/", limits: { fileSize: 12 * 1024 * 1024 } });

app.get("/", (req, res) => res.send("Pecipic backend ready"));

// Basic endpoint (kept as fallback)
app.post("/convert", upload.single("image"), async (req, res) => {
  res.status(400).send("Use /convert-ai for layout-preserving conversion");
});

// AI layout route: runs Python script to create docx
app.post("/convert-ai", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No file uploaded (form field 'image')");

    const imgPath = path.resolve(req.file.path);
    const outName = `converted-${Date.now()}.docx`;
    const outPath = path.resolve("outputs", outName);

    // Make outputs folder if doesn't exist
    if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");

    const pyScript = path.resolve("python", "layout_ocr.py");
    const args = [imgPath, outPath];

    console.log("Running Python script:", pyScript, args.join(" "));

    execFile("python3", [pyScript, ...args], { maxBuffer: 1024 * 1024 * 200 }, (err, stdout, stderr) => {
      if (err) {
        console.error("Python error:", err);
        console.error("stderr:", stderr?.toString?.());
        return res.status(500).send("AI conversion failed");
      }

      if (!fs.existsSync(outPath)) {
        console.error("Output file missing. Python stdout:", stdout);
        return res.status(500).send("AI conversion failed - no output file");
      }

      // Stream the docx to client
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(outPath)}"`);

      const filestream = fs.createReadStream(outPath);
      filestream.pipe(res);

      filestream.on("close", () => {
        try { fs.unlinkSync(imgPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
      });
    });
  } catch (e) {
    console.error("Server /convert-ai error:", e);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Pecipic backend listening on ${PORT}`));
