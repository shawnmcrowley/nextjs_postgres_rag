// Add Configs to API File Uploads to Accept Files Larger than Default 1mb Size
/** @type {import('next').NextConfig} */
const nextConfig = {

    experimental: {
        serverActions: {
          bodySizeLimit: '20mb',
        },
      },
};

export default nextConfig;
