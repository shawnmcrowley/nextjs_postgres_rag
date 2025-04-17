"use client";
// pages/index.js
import { useState } from "react";
import Head from "next/head";
import axios from "axios";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isFolderMode, setIsFolderMode] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB in bytes

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFileError(null);
    
    // Filter out directories and only keep actual files
    const validFiles = selectedFiles.filter(file => {
      if (!(file instanceof File)) return false;
      if (file.size === 0) return false;
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" is too large. Maximum size is 30MB.`);
        return false;
      }
      return true;
    });
    
    setFiles(validFiles);
  };

  const toggleSelectionMode = () => {
    setIsFolderMode(!isFolderMode);
    setFiles([]);
    setFileError(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!files.length) return;
    if (fileError) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);

    try {
      const response = await axios.post("/api/v1/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        maxContentLength: MAX_FILE_SIZE,
        maxBodyLength: MAX_FILE_SIZE,
      });
      setUploadResult(response.data);
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploadResult({
        error: error.response?.data?.error || "Error uploading files",
      });
    } finally {
      setUploading(false);
      setFiles([]);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const results = await response.json();
      console.log('Search results in page:', JSON.stringify(results, null, 2));
      
      // Process results to ensure content is properly formatted
      const processedResults = results.map(result => {
        console.log('Processing result in page:', {
          id: result.id,
          filename: result.filename,
          content: typeof result.content,
          contentValue: result.content,
          similarity: result.similarity
        });

        return {
          ...result,
          content: String(result.content || ''),
          metadata: result.metadata || {}
        };
      });

      setSearchResults(processedResults);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Head>
        <title>RAG Document System</title>
        <meta
          name="description"
          content="Retrieval-Augmented Generation for document processing"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold">
          Document Retrieval-Augmented Generation
        </h1>

        <div className="bg-gray-100 p-6 rounded-md">
          <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <div>
              <label className="block mb-2">
                Select files or folders (.doc, .xls, .pdf, .ppt) - Max 30MB per file
              </label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  className={`px-3 py-1 rounded text-sm ${
                    isFolderMode
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Folder Mode
                </button>
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  className={`px-3 py-1 rounded text-sm ${
                    !isFolderMode
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  File Mode
                </button>
              </div>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx"
                  multiple
                  {...(isFolderMode ? { webkitdirectory: "true", directory: "true" } : {})}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="border p-2 w-full bg-white rounded flex items-center justify-between">
                  <span className="text-gray-600">
                    {files.length > 0 ? `Selected ${files.length} file${files.length !== 1 ? 's' : ''}` : `Choose ${isFolderMode ? 'Folder' : 'Files'}`}
                  </span>
                  <span className="text-blue-500 text-sm">
                    {files.length > 0 ? 'Change Selection' : 'Browse'}
                  </span>
                </div>
              </div>
              {fileError && (
                <p className="mt-2 text-sm text-red-500">{fileError}</p>
              )}
              {files.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Selected files:</p>
                  <ul className="list-disc pl-4 mt-1 max-h-32 overflow-y-auto">
                    {files.map((file, index) => (
                      <li key={index} className="truncate">
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={!files.length || uploading || fileError}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {uploading ? "Uploading..." : `Upload ${files.length} Document${files.length !== 1 ? 's' : ''}`}
            </button>
          </form>

          {uploadResult && (
            <div className="mt-4">
              {uploadResult.error ? (
                <p className="text-red-500">{uploadResult.error}</p>
              ) : (
                <div className="text-green-500">
                  <p>Successfully uploaded:</p>
                  <ul className="list-disc pl-4">
                    {uploadResult.results && Array.isArray(uploadResult.results) && uploadResult.results.length > 0 ? (
                      uploadResult.results.map((result, index) => (
                        <li key={index}>
                          {result.filename} (ID: {result.documentId}, {result.chunks} chunks)
                        </li>
                      ))
                    ) : (
                      <li className="text-yellow-500">No files were uploaded successfully</li>
                    )}
                  </ul>
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-2 text-red-500">
                      <p>Errors occurred with some files:</p>
                      <ul className="list-disc pl-4">
                        {uploadResult.errors.map((error, index) => (
                          <li key={index}>
                            {error.filename}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-6 rounded-md">
          <h2 className="text-xl font-semibold mb-4">Query Documents</h2>
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div>
              <label className="block mb-2">Enter your query</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border p-2 w-full"
                placeholder="What information are you looking for?"
              />
            </div>
            <button
              type="submit"
              disabled={!query || isLoading}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-green-300"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <div className="mt-6 text-red-500">
              {error}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Search Results</h2>
              <div className="space-y-4">
                {searchResults.map((result, index) => {
                  console.log('Rendering result:', {
                    index,
                    filename: result.filename,
                    content: typeof result.content,
                    contentValue: result.content
                  });

                  // Format the content for display
                  const formattedContent = String(result.content || '')
                    .split('\n\n') // Split by double newlines for paragraphs
                    .map(paragraph => paragraph.trim())
                    .filter(paragraph => paragraph.length > 0);

                  return (
                    <div key={index} className="bg-white p-4 rounded-lg shadow">
                      <h3 className="font-semibold text-lg mb-2">{result.filename}</h3>
                      <div className="text-sm text-gray-600 mb-2">
                        Similarity: {(1 - result.similarity).toFixed(4)}
                      </div>
                      <div className="prose max-w-none">
                        {formattedContent.map((paragraph, i) => (
                          <div key={i} className="mb-4">
                            {paragraph.split('\n').map((line, j) => (
                              <p key={j} className="text-gray-700 leading-relaxed mb-2">
                                {line}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          <strong>Metadata:</strong>
                          <pre className="mt-1 p-2 bg-gray-50 rounded">
                            {JSON.stringify(result.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
