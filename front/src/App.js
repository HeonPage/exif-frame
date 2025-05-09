// src/App.js
import React, { useState, useRef } from "react";
import "./App.css";
function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processedImages, setProcessedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newFiles = files.map((file) => ({
        file,
        id: Date.now() + Math.random().toString(36).substring(2, 9),
        preview: URL.createObjectURL(file),
      }));

      setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
    // Reset input to allow re-selecting same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const newFiles = files.map((file) => ({
        file,
        id: Date.now() + Math.random().toString(36).substring(2, 9),
        preview: URL.createObjectURL(file),
      }));

      setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleRemoveFile = (id) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
    setProcessedImages((prevImages) =>
      prevImages.filter((image) => image.id !== id)
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one image to upload");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filter out files that have already been processed
      const filesToProcess = selectedFiles.filter(
        (fileObj) => !processedImages.some((img) => img.id === fileObj.id)
      );

      if (filesToProcess.length === 0) {
        setError("All selected images have already been processed");
        setLoading(false);
        return;
      }

      // Use single upload for one file, multiple upload for multiple files
      if (filesToProcess.length === 1) {
        const fileObj = filesToProcess[0];
        const formData = new FormData();
        formData.append("image", fileObj.file);

        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to upload image: ${fileObj.file.name}`);
        }

        const data = await response.json();
        const processedResult = {
          id: fileObj.id,
          originalName: fileObj.file.name,
          processedUrl: `${process.env.REACT_APP_BACKEND_API_URL}${data.processedImage}`,
          exifData: data.exifData,
        };

        setProcessedImages((prev) => [...prev, processedResult]);
      } else {
        // Multiple file processing
        const formData = new FormData();
        // Create a map to keep track of file IDs associated with their index
        const fileIdMap = {};

        filesToProcess.forEach((fileObj, index) => {
          formData.append("images", fileObj.file);
          fileIdMap[index] = fileObj.id;
        });

        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_API_URL}/api/upload-multiple`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to upload multiple images"
          );
        }

        const data = await response.json();

        const processedResults = data.processedImages.map(
          (processedImage, index) => ({
            id: fileIdMap[index],
            originalName: filesToProcess[index].file.name,
            processedUrl: `${process.env.REACT_APP_BACKEND_API_URL}${processedImage.path}`,
            exifData: processedImage.exifData,
          })
        );

        setProcessedImages((prev) => [...prev, ...processedResults]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // Clean up object URLs to prevent memory leaks
    selectedFiles.forEach((fileObj) => {
      URL.revokeObjectURL(fileObj.preview);
    });

    setSelectedFiles([]);
    setProcessedImages([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadAllImages = async () => {
    if (processedImages.length === 0) {
      setError("No processed images to download");
      return;
    }

    setLoading(true);
    try {
      // Get all processed image paths to send to server
      const imageList = processedImages.map((img) => ({
        originalName: img.originalName,
        processedPath: img.processedUrl.replace(
          `${process.env.REACT_APP_BACKEND_API_URL}/uploads/`,
          ""
        ),
      }));

      // Create a request to the server to generate a ZIP file
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_API_URL}/api/download-zip`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageList }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create ZIP file");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `processed-images-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle individual image download
  const downloadSingleImage = async (processedUrl, fileName) => {
    try {
      // Fetch the image file
      const response = await fetch(processedUrl);

      if (!response.ok) {
        throw new Error("Failed to download image");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `processed-${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>EXIF Photo Processor</h1>
        <p>Upload photos to add EXIF data to the bottom of the images</p>
      </header>
      <main>
        <section
          className="upload-container"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            className="upload-prompt"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p>
              Drag and drop your photos here
              <br />
              or click to browse
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
              multiple
            />
          </div>
        </section>

        {error && <div className="error-message">{error}</div>}

        {selectedFiles.length > 0 && (
          <section className="images-list">
            <h2>Uploaded Images</h2>
            <div className="images-container">
              {selectedFiles.map((fileObj) => {
                const processedImage = processedImages.find(
                  (img) => img.id === fileObj.id
                );
                return (
                  <div key={fileObj.id} className="image-item">
                    <div className="image-preview-container">
                      <img
                        src={fileObj.preview}
                        alt="Preview"
                        className="image-preview"
                      />
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveFile(fileObj.id)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="image-details">
                      <p className="image-name">{fileObj.file.name}</p>
                      {processedImage && processedImage.exifData && (
                        <div className="exif-data">
                          <div className="exif-item">
                            <span className="exif-label">Date/Time:</span>
                            <span className="exif-value">
                              {processedImage.exifData.dateTime}
                            </span>
                          </div>
                          <div className="exif-item">
                            <span className="exif-label">Camera:</span>
                            <span className="exif-value">
                              {processedImage.exifData.make}{" "}
                              {processedImage.exifData.model}
                            </span>
                          </div>
                          <div className="exif-item">
                            <span className="exif-label">Lens:</span>
                            <span className="exif-value">
                              {processedImage.exifData.lens}
                            </span>
                          </div>
                        </div>
                      )}
                      {processedImage && (
                        <button
                          onClick={() =>
                            downloadSingleImage(
                              processedImage.processedUrl,
                              fileObj.file.name
                            )
                          }
                          className="download-btn"
                        >
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="action-buttons">
              <button
                className="process-btn"
                onClick={handleUpload}
                disabled={loading}
              >
                {loading ? "Processing..." : "Process Images"}
              </button>

              {processedImages.length > 1 && (
                <button
                  className="download-all-btn"
                  onClick={downloadAllImages}
                >
                  Download All Processed Images
                </button>
              )}

              <button className="reset-btn" onClick={handleReset}>
                Clear All
              </button>
            </div>
          </section>
        )}
      </main>
      <footer className="app-footer">
        <p>© 2025 EXIF Photo Processor</p>
      </footer>
    </div>
  );
}

export default App;
