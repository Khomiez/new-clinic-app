/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any Next.js configuration options here
  reactStrictMode: true,
  // Example: Configure image domains if needed
  images: {
    domains: [],
  },
  // Example: Add environment variables to be accessible on the client
  env: {
    APP_NAME: 'Boxmoji Clinical',
  },
};

module.exports = nextConfig;