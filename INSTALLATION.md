# EXIF Photo Processor - Installation Guide

This guide will help you set up the EXIF Photo Processor service, which adds camera information and date to your photos.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Git (optional)

## Backend Setup

1. Create a new directory for your project and navigate into it:

```bash
mkdir exif-photo-processor
cd exif-photo-processor
```

2. Create a backend directory and navigate into it:

```bash
mkdir backend
cd backend
```

3. Initialize the project:

```bash
npm init -y
```

4. Install the required dependencies:

```bash
npm install express cors multer exif-parser canvas jimp
npm install nodemon --save-dev
```

5. Create a fonts directory:

```bash
mkdir fonts
```

6. Create an uploads directory:

```bash
mkdir uploads
```

7. Copy the server.js file from the provided code.

8. Update your package.json with the provided scripts section.

9. Start the backend server:

```bash
npm run dev
```

The server should now be running on http://localhost:5000.

## Frontend Setup

1. In a new terminal, navigate back to your project directory and create a React app:

```bash
cd ..
npx create-react-app frontend
cd frontend
```

2. Install required dependencies:

```bash
npm install axios
```

3. Replace the content of src/App.js with the provided React code.

4. Replace the content of src/App.css with the provided CSS.

5. Start the React development server:

```bash
npm start
```

The frontend should now be running on http://localhost:3000.

## Using the Application

1. Open your browser and navigate to http://localhost:3000.
2. Use the file input to select an image.
3. Click the "Process Image" button.
4. Once processing is complete, you'll see the original image and the processed image with EXIF data displayed at the bottom.

## Notes

- The application extracts EXIF data from your photos and adds it to the bottom of the image.
- If EXIF data isn't available, default values or the current date will be used.
- The design matches the example provided with information on the bottom-left and bottom-right of the image.
