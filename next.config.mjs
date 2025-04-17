// Add Configs to API File Uploads to Accept Files Larger than Default 1mb Size
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
          bodySizeLimit: '30mb',
        },
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

