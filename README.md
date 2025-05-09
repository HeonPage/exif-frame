# EXIF Photo Processor

A web application that extracts EXIF data from uploaded photos and adds this information to the image, similar to camera watermarks. The application displays camera information (manufacturer, model, lens) in the bottom right corner and date/time information in the bottom left corner.

## Features

- Upload images via drag & drop or file browser
- Extract EXIF data including:
  - Date and time the photo was taken
  - Camera manufacturer and model
  - Lens information
- Process images to add EXIF data in a stylish format
- Download processed images
- Modern, responsive UI

## Technology Stack

### Backend

- Node.js
- Express.js
- multer (for file uploads)
- exif-parser (for extracting EXIF data)
- canvas & jimp (for image processing)

### Frontend

- React.js
- Modern CSS with responsive design

## Installation

Follow the steps in the [Installation Guide](./INSTALLATION.md) to set up the project locally.

## Usage

1. Upload an image using drag & drop or the file browser
2. Click "Process Image" to extract EXIF data and add it to the image
3. View the processed image with EXIF data overlaid
4. Download the processed image

## How It Works

1. The frontend allows users to upload images
2. The backend extracts EXIF data using the exif-parser library
3. The image is processed with canvas to add text in specific locations:
   - Date/time in the bottom left
   - Camera and lens information in the bottom right
   - A vertical separator line is added for visual style
4. The processed image is sent back to the frontend for display and download

## Example

The processed image will look similar to the example below, with EXIF data displayed at the bottom:

```
                                          |
2025/05/04 12:32:38                       | SONY ILCE-7M3
                                          | FE 55mm F1.8 ZA
```

## License

MIT License
# exif-frame
# exif-frame
