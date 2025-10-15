import sys, cv2, pytesseract
from PIL import Image
from docx import Document
import os

# Ensure arguments
if len(sys.argv) != 3:
    print("Usage: python3 convert_layout.py <input_image> <output_docx>")
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]

# Verify input image exists
if not os.path.exists(input_path):
    print(f"❌ Input file not found: {input_path}")
    sys.exit(1)

try:
    # Read image
    img = cv2.imread(input_path)

    if img is None:
        raise ValueError("Unable to read image file.")

    # Convert to RGB (Tesseract works better in RGB)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Run OCR with layout info
    custom_config = r'--oem 3 --psm 6'
    extracted_text = pytesseract.image_to_string(rgb, config=custom_config)

    # Save text into Word document
    doc = Document()
    doc.add_paragraph(extracted_text)
    doc.save(output_path)

    print("✅ Conversion successful:", output_path)

except Exception as e:
    print("❌ Conversion failed:", e)
    sys.exit(1)
