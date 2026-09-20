"use client";

import React, { useState, useRef } from "react";

export default function ImageAnalyzer({ onAnalysisComplete, onImageSelect }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  const canvasRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onImageSelect?.(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError(null);
      setHasAnalyzed(false);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const drawDetections = (detections, imgSrc) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      // Set canvas dimensions to match the actual image resolution
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the base image onto the canvas
      ctx.drawImage(img, 0, 0);
      
      // Draw each detection box and label
      detections.forEach((det) => {
        // Extract YOLO's center coordinates
        const { x: centerX, y: centerY, width, height } = det.bbox;
        const cls = det.cls;
        const conf = det.confidence.toFixed(2);
        
        // Convert center X/Y to Canvas top-left X/Y
        const x = centerX - (width / 2);
        const y = centerY - (height / 2);
        
        // Draw bounding box
        ctx.strokeStyle = "#ef4444"; // Tailwind red-500
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Format the text label
        const text = `${cls} ${conf}`;
        ctx.font = "bold 16px Inter, system-ui, sans-serif";
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 16;
        
        // Draw solid background for the text for readability
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x, y - textHeight - 8, textWidth + 12, textHeight + 8);
        
        // Draw the text over the background
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x + 6, y - 6);
      });
      
      setHasAnalyzed(true);
    };
    
    img.src = imgSrc;
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    // Append the file using 'file' as the key to match typical FastAPI endpoints
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://127.0.0.1:8000/predict-preview", {
        method: "POST",
        // Do NOT set the Content-Type header. Fetch handles the boundary automatically for FormData
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.detections) {
        drawDetections(data.detections, previewUrl);
        onAnalysisComplete?.(data.detections);
      } else {
        setError("Invalid response format from the server. Expected 'detections' array.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to analyze image. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-100 selection:bg-blue-500/30">
      <div className="max-w-3xl w-full space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            CivicSense AI
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Upload imagery to instantly detect road defects using our machine learning model.
          </p>
        </div>

        {/* Main Card */}
        <div className="mt-8 bg-gray-900/50 shadow-2xl rounded-3xl p-6 sm:p-8 border border-gray-800 backdrop-blur-xl">
          <div className="flex flex-col items-center justify-center w-full">
            
            {!previewUrl ? (
              /* File Upload State */
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-72 border-2 border-gray-700 border-dashed rounded-2xl cursor-pointer bg-gray-800/20 hover:bg-gray-800/60 hover:border-blue-500/50 transition-all duration-300 ease-in-out group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-4">
                  <div className="p-4 rounded-full bg-gray-800 group-hover:bg-blue-500/10 transition-colors">
                    <svg className="w-10 h-10 text-gray-400 group-hover:text-blue-400 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="mb-1 text-base text-gray-300"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
                    <p className="text-sm text-gray-500">PNG, JPG or JPEG up to 10MB</p>
                  </div>
                </div>
                <input id="dropzone-file" type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              /* Image Preview & Result State */
              <div className="relative w-full flex flex-col items-center rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 group">
                {/* 
                  The Canvas is initially hidden until we have bounding boxes to draw. 
                  Once analyzed, the original img tag is hidden and the Canvas takes over.
                */}
                <canvas 
                  ref={canvasRef} 
                  className={`max-w-full h-auto w-full object-contain ${!hasAnalyzed ? "hidden" : "block"}`}
                />
                
                {!hasAnalyzed && (
                  <img 
                    src={previewUrl} 
                    alt="Upload preview" 
                    className="max-w-full h-auto max-h-[60vh] object-contain w-full" 
                  />
                )}

                {/* Reset Button */}
                <button 
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    onImageSelect?.(null);
                    setHasAnalyzed(false);
                    setError(null);
                  }}
                  className="absolute top-4 right-4 bg-gray-900/80 hover:bg-red-500 text-gray-300 hover:text-white p-2.5 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg border border-gray-700 hover:border-red-400"
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            )}
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <span className="text-sm font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || isLoading || hasAnalyzed}
              className={`
                relative flex items-center justify-center gap-3 w-full sm:w-auto min-w-[200px] px-8 py-3.5 
                text-base font-semibold rounded-xl text-white transition-all duration-300
                ${!selectedFile || hasAnalyzed
                  ? 'bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700' 
                  : isLoading 
                    ? 'bg-blue-600/50 cursor-wait border border-blue-500/50' 
                    : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-lg shadow-blue-900/25 hover:shadow-emerald-900/40 transform hover:-translate-y-0.5 border border-white/10'
                }
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing Model...</span>
                </>
              ) : hasAnalyzed ? (
                <>
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span className="text-emerald-400">Analysis Complete</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  <span>Analyze Image</span>
                </>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}