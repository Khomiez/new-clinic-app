/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add any Next.js configuration options here
  reactStrictMode: true,
  
  // Configure webpack to handle Node.js modules properly
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Exclude Node.js modules from client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        os: false,
        util: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Optimize build by excluding certain modules from bundling
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'cloudinary': 'commonjs cloudinary',
      });
    }

    return config;
  },

  // Configure image domains - Add Cloudinary for Next.js Image optimization
  images: {
    domains: ['res.cloudinary.com'], // Cloudinary domain
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Add environment variables to be accessible on the client
  env: {
    APP_NAME: 'Boxmoji Clinical',
  },

  // Experimental features for better performance (optional)
  experimental: {
    // Enable swc minify for better performance
    swcMinify: true,
    // Optimize package imports
    optimizePackageImports: ['@reduxjs/toolkit', 'react-redux'],
  },

  // Configure headers for better security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Configure TypeScript settings
  typescript: {
    // Set to true to ignore TypeScript errors during build (not recommended for production)
    ignoreBuildErrors: false,
  },

  // Configure ESLint settings
  eslint: {
    // Set to true to ignore ESLint errors during build (not recommended for production)
    ignoreDuringBuilds: false,
  },

  // Enable source maps for better debugging in development
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
};

module.exports = nextConfig;