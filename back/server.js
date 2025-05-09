// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const ExifParser = require("exif-parser");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, registerFont } = require("canvas");
const archiver = require("archiver");
const app = express();
const PORT = process.env.PORT || 5151;

// Middleware
app.use(cors());
app.use(express.json());
// app.use(express.json({ limit: "600mb" }));
// app.use(express.urlencoded({ extended: true, limit: "600mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/logo", express.static(path.join(__dirname, "logo")));

// Register font for canvas
const fontDir = path.join(__dirname, "/fonts");
if (!fs.existsSync(fontDir)) {
  fs.mkdirSync(fontDir, { recursive: true });
}

// Download and register Helvetica font or use system fonts
try {
  registerFont(path.join(__dirname, "/fonts/Helvetica.ttf"), {
    family: "Helvetica",
  });
  console.log("register helvetica");
} catch (e) {
  console.log("Using system fonts as fallback");
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  // limits: { fileSize: 500 * 1024 * 1024}
});

// Check if logo exists for the given brand
function getBrandLogoPath(brand) {
  if (!brand) return null;

  // Normalize brand name (lowercase)
  const normalizedBrand = brand.toLowerCase();
  const logoPath = path.join(__dirname, "logo", `${normalizedBrand}.png`);

  // Check if logo file exists
  if (fs.existsSync(logoPath)) {
    return logoPath;
  }
  return null;
}

// Helper function to truncate text if longer than maxLength
function truncateText(text, maxLength = 50) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Helper function to extract EXIF data
async function extractAndProcessImage(filePath) {
  let buffer = fs.readFileSync(filePath);
  let exifData = {};

  // Parse EXIF data
  try {
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    exifData = result.tags;
  } catch (exifError) {
    console.error("Error extracting EXIF data:", exifError);
  }

  // Format date like YYYY/MM/DD HH:MM:SS (if not available, use current date)
  let dateTimeStr = "";
  if (exifData.DateTimeOriginal) {
    const date = new Date(exifData.DateTimeOriginal * 1000);
    dateTimeStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(date.getDate()).padStart(2, "0")}`;
  } else {
    const now = new Date();
    dateTimeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(now.getDate()).padStart(2, "0")}`;
  }

  // Extract camera and lens info
  const make = exifData.Make || "SONY";
  const model = exifData.Model || "ILCE-7M3";
  const lens = exifData.LensModel || exifData.LensInfo || "FE 55mm F1.8 ZA"; // Default lens

  // Truncate model and lens text if longer than 30 characters
  const truncatedModel = truncateText(model, 30);
  const truncatedLens = truncateText(lens, 30);

  // Process the image using canvas
  const imageData = await loadImage(filePath);
  const imageWidth = imageData.width;
  const imageHeight = imageData.height;

  // Set frame dimensions
  const frameWidth = 120; // Fixed frame width for left and right
  const topFrameHeight = 120; // Fixed frame height for top
  const bottomFrameHeight = 340; // Fixed frame height for bottom

  // Calculate new canvas dimensions
  const canvasWidth = imageWidth + frameWidth * 2; // original width + left frame + right frame
  const canvasHeight = imageHeight + topFrameHeight + bottomFrameHeight; // original height + top frame + bottom frame

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Draw white frames
  ctx.fillStyle = "white";
  // Top frame
  ctx.fillRect(0, 0, canvasWidth, topFrameHeight);
  // Bottom frame
  ctx.fillRect(
    0,
    canvasHeight - bottomFrameHeight,
    canvasWidth,
    bottomFrameHeight
  );
  // Left frame
  ctx.fillRect(0, topFrameHeight, frameWidth, imageHeight);
  // Right frame
  ctx.fillRect(
    canvasWidth - frameWidth,
    topFrameHeight,
    frameWidth,
    imageHeight
  );

  // Draw original image in the center
  ctx.drawImage(imageData, frameWidth, topFrameHeight, imageWidth, imageHeight);

  // Draw date on bottom frame
  ctx.fillStyle = "black";
  ctx.font = `80px Helvetica`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    dateTimeStr,
    frameWidth + 80,
    canvasHeight - bottomFrameHeight / 2
  );

  // Draw camera model and lens info text to measure
  ctx.font = `72px Helvetica`;
  const lensTextWidth = ctx.measureText(truncatedLens).width;
  const modelTextWidth = ctx.measureText(make + " " + truncatedModel).width;
  const maxTextWidth = Math.max(lensTextWidth, modelTextWidth);

  // Calculate dynamic lineX position based on text width
  const rightMargin = 80; // Padding from right edge
  const textBlockWidth = maxTextWidth + 100; // Add margin between line and text
  let lineX = canvasWidth - textBlockWidth - rightMargin - frameWidth;

  // Draw vertical line in bottom frame
  ctx.beginPath();
  ctx.moveTo(lineX, canvasHeight - bottomFrameHeight + 70);
  ctx.lineTo(lineX, canvasHeight - 70);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw logo (or brand text) in bottom frame
  const logoPath = getBrandLogoPath(make);
  if (logoPath) {
    try {
      const logoImg = await loadImage(logoPath);
      const maxLogoHeight = 120;
      const maxLogoWidth = lineX - 120;

      let logoWidth = logoImg.width;
      let logoHeight = logoImg.height;
      if (logoHeight > maxLogoHeight) {
        const scale = maxLogoHeight / logoHeight;
        logoWidth *= scale;
        logoHeight = maxLogoHeight;
      }
      if (logoWidth > maxLogoWidth) {
        const scale = maxLogoWidth / logoWidth;
        logoWidth *= scale;
        logoHeight *= scale;
      }

      const logoX = lineX - 60 - logoWidth;
      const logoY = canvasHeight - bottomFrameHeight / 2 - logoHeight / 2;
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
    } catch (logoError) {
      console.error("Error loading logo:", logoError);
      ctx.font = `bold 96px Helvetica`;
      ctx.textAlign = "right";
      ctx.fillText(make, lineX - 60, canvasHeight - bottomFrameHeight / 2);
    }
  } else {
    ctx.font = `bold 140px Helvetica`;
    ctx.textAlign = "right";
    ctx.fillText(make, lineX - 60, canvasHeight - bottomFrameHeight / 2);
  }

  // Draw camera model and lens info in bottom frame (right of line)
  ctx.font = `72px Helvetica`;
  ctx.textAlign = "right";
  const modelYOffset = 45;
  ctx.fillText(
    make + " " + truncatedModel,
    canvasWidth - rightMargin - frameWidth,
    canvasHeight - bottomFrameHeight / 2 - modelYOffset
  );
  ctx.fillText(
    truncatedLens,
    canvasWidth - rightMargin - frameWidth,
    canvasHeight - bottomFrameHeight / 2 + modelYOffset
  );

  // Save canvas as image
  const processedImagePath = path.join(
    __dirname,
    "uploads",
    `processed-${path.basename(filePath)}`
  );
  buffer = canvas.toBuffer("image/jpeg");
  fs.writeFileSync(processedImagePath, buffer);

  return {
    originalName: path.basename(filePath),
    processedPath: processedImagePath,
    processedName: `processed-${path.basename(filePath)}`,
    exifData: {
      dateTime: dateTimeStr,
      make: make,
      model: truncatedModel,
      lens: truncatedLens,
    },
  };
}

// API endpoint to upload image and get EXIF data
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const result = await extractAndProcessImage(filePath);

    res.json({
      originalImage: `/uploads/${result.originalName}`,
      processedImage: `/uploads/${result.processedName}`,
      exifData: result.exifData,
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Error processing image" });
  }
});

// Multiple image upload API
app.post(
  "/api/upload-multiple",
  upload.array("images", 100),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const processedResults = [];

      for (const file of req.files) {
        const filePath = file.path;
        const result = await extractAndProcessImage(filePath);

        processedResults.push({
          originalName: result.originalName,
          path: `/uploads/${result.processedName}`,
          exifData: result.exifData,
        });
      }

      res.json({
        processedImages: processedResults,
      });
    } catch (error) {
      console.error("Error processing multiple images:", error);
      res.status(500).json({ error: "Error processing multiple images" });
    }
  }
);

// Endpoint to generate and download a ZIP of processed images
app.post("/api/download-zip", async (req, res) => {
  try {
    const { imageList } = req.body;

    if (!imageList || imageList.length === 0) {
      return res.status(400).json({ error: "No image data provided" });
    }

    console.log("Received image list for ZIP:", imageList);

    // Create ZIP archive
    const zipFilename = `processed-images-${Date.now()}.zip`;
    const zipPath = path.join(__dirname, "uploads", zipFilename);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`ZIP created: ${zipPath} (${archive.pointer()} bytes)`);
      // Send the zip file
      res.download(zipPath, zipFilename, () => {
        // Clean up the zip file after download
        fs.unlinkSync(zipPath);
      });
    });

    archive.on("error", (err) => {
      console.error("Archiver error:", err);
      res.status(500).json({ error: "Failed to create zip archive" });
    });

    archive.pipe(output);

    // Add processed images to the archive
    let fileCount = 0;
    for (const item of imageList) {
      const processedPath = path.join(__dirname, "uploads", item.processedPath);
      console.log("Looking for file:", processedPath);

      if (fs.existsSync(processedPath)) {
        fileCount++;
        archive.file(processedPath, { name: `processed-${item.originalName}` });
        console.log(`Added file to archive: ${item.originalName}`);
      } else {
        console.log(`File not found: ${processedPath}`);
      }
    }

    console.log(`Total files added to ZIP: ${fileCount}`);

    if (fileCount === 0) {
      archive.abort();
      return res.status(404).json({ error: "No files found to add to ZIP" });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error creating ZIP file:", error);
    res
      .status(500)
      .json({ error: "Error creating ZIP file: " + error.message });
  }
});

// Ensure directories exist
const logoDir = path.join(__dirname, "logo");
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
  console.log("Created logo directory at:", logoDir);
}

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory at:", uploadsDir);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Logo directory path: ${path.join(__dirname, "logo")}`);
  console.log(`Uploads directory path: ${path.join(__dirname, "uploads")}`);
});
