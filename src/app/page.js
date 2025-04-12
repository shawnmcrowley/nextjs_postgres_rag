"use client"
// pages/index.js
import { useState } from 'react';
import Head from 'next/head';
import axios from 'axios';

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    
    try {
      const response = await axios.post('/api/upload', formData);
      setUploadResult(response.data);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadResult({ error: error.response?.data?.error || 'Error uploading file' });
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query) return;
    
    setSearching(true);
    
    try {
      const response = await axios.post('/api/search', { query });
      setSearchResult(response.data);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResult({ error: error.response?.data?.error || 'Error searching' });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Head>
        <title>RAG Document System</title>
        <meta name="description" content="Retrieval-Augmented Generation for document processing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Document RAG System</h1>
        
        <div className="bg-gray-100 p-6 rounded-md">
          <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <div>
              <label className="block mb-2">Select file (.doc, .xls, .pdf, .ppt)</label>
              <input 
                type="file" 
                onChange={handleFileChange}
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx"
                className="border p-2 w-full"
              />
            </div>
            <button 
              type="submit" 
              disabled={!file || uploading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>
          
          {uploadResult && (
            <div className="mt-4">
              {uploadResult.error ? (
                <p className="text-red-500">{uploadResult.error}</p>
              ) : (
                <p className="text-green-500">Successfully uploaded {uploadResult.filename}</p>
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
              disabled={!query || searching}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-green-300"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
          
          {searchResult && (
            <div className="mt-6">
              {searchResult.error ? (
                <p className="text-red-500">{searchResult.error}</p>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-md mb-4">
                    <h3 className="font-semibold mb-2">Answer:</h3>
                    <p>{searchResult.answer}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Sources:</h3>
                    <ul className="list-disc pl-5">
                      {searchResult.sources.map((source) => (
                        <li key={source.id} className="mb-2">
                          <p><strong>{source.filename}</strong> (Similarity: {(source.similarity * 100).toFixed(2)}%)</p>
                          <p className="text-sm text-gray-500">
                            Uploaded: {new Date(source.metadata.uploadDate).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}