// Add Configs to API File Uploads to Accept Files Larger than Default 1mb Size
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
          bodySizeLimit: '30mb',
        },
        // Enable Turbopack
        turbo: {
          rules: {
            // Add any specific rules needed for your file types
            '*.pdf': ['file'],
            '*.doc': ['file'],
            '*.docx': ['file'],
            '*.xls': ['file'],
            '*.xlsx': ['file'],
            '*.ppt': ['file'],
            '*.pptx': ['file'],
          }
        }
      },
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
        };
        return config;
    }
};

export default nextConfig;

