"use client";
// pages/index.js
import { useState } from "react";
import Head from "next/head";
import axios from "axios";

const renderContentWithLinks = (text, showAll, setShowAll) => {
  // First split by code blocks to preserve them
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const parts = text.split(codeBlockRegex);
  
  return parts.map((part, index) => {
    // If this is a code block, render it as is
    if (index % 2 === 1) {
      return (
        <div key={`code-${index}`} className="relative group">
          <pre 
            className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto font-mono text-sm
                      border border-gray-200 dark:border-gray-700
                      shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            {part}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(part);
              const button = document.getElementById(`copy-button-${index}`);
              if (button) {
                button.innerHTML = `
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                `;
                setTimeout(() => {
                  button.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                    </svg>
                  `;
                }, 2000);
              }
            }}
            id={`copy-button-${index}`}
            className="absolute top-2 right-2 p-2 rounded-md bg-gray-200 dark:bg-gray-700
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      hover:bg-gray-300 dark:hover:bg-gray-600"
            title="Copy code"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
      );
    }

    // For non-code parts, split by URLs and paragraphs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const paragraphs = part.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Show only first 3 paragraphs initially
    const visibleParagraphs = showAll ? paragraphs : paragraphs.slice(0, 3);
    
    return (
      <div key={`text-${index}`} className="space-y-2 w-full max-w-none">
        {visibleParagraphs.map((paragraph, pIndex) => {
          // Split paragraph into lines and limit to 5 lines
          const lines = paragraph.split('\n').filter(line => line.trim().length > 0);
          const visibleLines = lines.slice(0, 5);
          const hasMoreLines = lines.length > 5;
          
          return (
            <div key={`para-${index}-${pIndex}`} className="space-y-1 w-full max-w-none">
              {visibleLines.map((line, lineIndex) => {
                const textParts = line.split(urlRegex);
                return (
                  <div key={`line-${index}-${pIndex}-${lineIndex}`} className="w-full max-w-none">
                    {textParts.map((textPart, textIndex) => {
                      if (textPart.match(urlRegex)) {
                        const isGithub = textPart.includes('github.com');
                        const isDocumentation = textPart.includes('docs') || textPart.includes('readme');
                        const isExternal = !textPart.includes(window.location.hostname);
                        
                        return (
                          <a 
                            key={`link-${index}-${pIndex}-${lineIndex}-${textIndex}`}
                            href={textPart} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`
                              ${isGithub ? 'text-purple-600 hover:text-purple-800' : 
                                isDocumentation ? 'text-green-600 hover:text-green-800' : 
                                isExternal ? 'text-blue-600 hover:text-blue-800' : 
                                'text-indigo-600 hover:text-indigo-800'}
                              hover:underline transition-colors duration-200
                              font-medium
                            `}
                          >
                            {textPart}
                          </a>
                        );
                      }
                      return <span key={`text-${index}-${pIndex}-${lineIndex}-${textIndex}`} className="w-full max-w-none">{textPart}</span>;
                    })}
                  </div>
                );
              })}
              {hasMoreLines && (
                <button
                  onClick={() => {
                    const element = document.getElementById(`more-lines-${index}-${pIndex}`);
                    if (element) {
                      element.classList.toggle('hidden');
                      const button = document.getElementById(`more-lines-button-${index}-${pIndex}`);
                      if (button) {
                        button.textContent = element.classList.contains('hidden') 
                          ? `Show ${lines.length - 5} more lines` 
                          : 'Show fewer lines';
                      }
                    }
                  }}
                  id={`more-lines-button-${index}-${pIndex}`}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Show {lines.length - 5} more lines
                </button>
              )}
              {hasMoreLines && (
                <div id={`more-lines-${index}-${pIndex}`} className="hidden w-full max-w-none">
                  {lines.slice(5).map((line, lineIndex) => {
                    const textParts = line.split(urlRegex);
                    return (
                      <div key={`more-line-${index}-${pIndex}-${lineIndex}`} className="w-full max-w-none">
                        {textParts.map((textPart, textIndex) => {
                          if (textPart.match(urlRegex)) {
                            const isGithub = textPart.includes('github.com');
                            const isDocumentation = textPart.includes('docs') || textPart.includes('readme');
                            const isExternal = !textPart.includes(window.location.hostname);
                            
                            return (
                              <a 
                                key={`more-link-${index}-${pIndex}-${lineIndex}-${textIndex}`}
                                href={textPart} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`
                                  ${isGithub ? 'text-purple-600 hover:text-purple-800' : 
                                    isDocumentation ? 'text-green-600 hover:text-green-800' : 
                                    isExternal ? 'text-blue-600 hover:text-blue-800' : 
                                    'text-indigo-600 hover:text-indigo-800'}
                                  hover:underline transition-colors duration-200
                                  font-medium
                                `}
                              >
                                {textPart}
                              </a>
                            );
                          }
                          return <span key={`more-text-${index}-${pIndex}-${lineIndex}-${textIndex}`} className="w-full max-w-none">{textPart}</span>;
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {paragraphs.length > 3 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Show {paragraphs.length - 3} more paragraphs
          </button>
        )}
      </div>
    );
  });
};

const renderContentWithCode = (text) => {
  const codeBlockRegex = /```([\s\S]*?)```/g;
  return text.split(codeBlockRegex).map((part, index) => {
    if (part.match(codeBlockRegex)) {
      return (
        <div key={index} className="relative group">
          <pre 
            className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto font-mono text-sm
                      border border-gray-200 dark:border-gray-700
                      shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            {part}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(part);
            }}
            className="absolute top-2 right-2 p-2 rounded-md bg-gray-200 dark:bg-gray-700
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      hover:bg-gray-300 dark:hover:bg-gray-600"
            title="Copy code"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
      );
    }
    return part;
  });
};

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
  const [showAll, setShowAll] = useState(false);
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
    <div className="container mx-auto px-12 max-w-none">
      <Head>
        <title>Retrieval-Augmented Generation Application</title>
        <meta
          name="description"
          content="Retrieval-Augmented Generation for Document Processing"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col gap-8 w-full">
        <h1 className="text-3xl font-bold">
          Retrieval-Augmented Generation System
        </h1>

        <div className="bg-gray-100 p-8 rounded-md w-full">
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

        <div className="bg-gray-100 p-8 rounded-md w-full">
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
            <div className="mt-8 w-full">
              <h2 className="text-2xl font-bold mb-6">Search Results</h2>
              <div className="space-y-8 w-full">
                {searchResults.map((result, index) => {
                  console.log('Rendering result:', {
                    index,
                    filename: result.filename,
                    content: typeof result.content,
                    contentValue: result.content
                  });

                  return (
                    <div key={index} className="w-full">
                      <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:border-blue-200 transition-colors">
                        <div className="px-12 py-4 border-b border-gray-200">
                          <h3 className="font-semibold text-lg text-gray-800">{result.filename}</h3>
                          <div className="flex items-center mt-3">
                            <span className="text-sm text-gray-600">Relevance: </span>
                            <div className="ml-2 flex items-center">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${((1 - result.similarity) * 100).toFixed(1)}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm font-medium text-gray-700">
                                {((1 - result.similarity) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full">
                          <div className="pt-12 pb-12 pl-16 pr-0 space-y-6">
                            {renderContentWithLinks(result.content, showAll, setShowAll)}
                          </div>
                          
                          {result.metadata && Object.keys(result.metadata).length > 0 && (
                            <div className="pt-4 pb-4 pl-16 pr-0 border-b border-gray-100">
                              <button 
                                className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                                onClick={() => {
                                  const element = document.getElementById(`metadata-${index}`);
                                  if (element) {
                                    element.classList.toggle('hidden');
                                  }
                                }}
                              >
                                <span>Show Metadata</span>
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div id={`metadata-${index}`} className="hidden mt-3">
                                <div className="bg-gray-50 p-4 rounded text-sm">
                                  {Object.entries(result.metadata).map(([key, value]) => {
                                    const displayValue = key.toLowerCase() === 'size' && typeof value === 'number'
                                      ? `${(value / (1024 * 1024)).toFixed(2)} MB`
                                      : String(value);
                                    
                                    return (
                                      <div key={key} className="mb-2">
                                        <span className="font-medium text-gray-700">{key}:</span>{' '}
                                        <span className="text-gray-600">{displayValue}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="px-12 py-4">
                            <button
                              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                              className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                            >
                              <span>Back To Top</span>
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
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
