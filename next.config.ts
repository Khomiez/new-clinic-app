import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Force environment variables to be available at runtime
  // NOTE: NODE_ENV is not allowed in env config, it's automatically set by Next.js
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
  },

  // TypeScript configuration
  typescript: {
    // Enable type checking during build
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Enable ESLint during build
    ignoreDuringBuilds: false,
  },

  // Image optimization configuration
  images: {
    // Configure remote patterns for external images (domains is deprecated)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
    ],
    // Image formats to support
    formats: ['image/webp', 'image/avif'],
    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Server external packages (moved from experimental in Next.js 15)
  serverExternalPackages: [
    'cloudinary',
    'mongoose',
    '@cloudinary/react',
    '@cloudinary/url-gen',
  ],

  // Experimental features (updated for Next.js 15)
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
    ],
  },

  // Webpack configuration for better module handling
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle canvas module (sometimes needed for pdf processing)
    config.resolve.alias.canvas = false;
    
    // Handle fs module for server-side file operations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Optimize MongoDB/Mongoose for server-side
    if (isServer) {
      config.externals = [...(config.externals || []), 'mongodb-client-encryption'];
    }

    // Handle PDF.js worker
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.js': 'pdfjs-dist/build/pdf.worker.min.js',
    };

    return config;
  },

  // Headers configuration for security and CORS
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
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
      {
        // CORS headers for API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://yourdomain.com' 
              : 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },

  // Redirects configuration
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/login.html',
        destination: '/login',
        permanent: true,
      },
    ];
  },

  // Rewrites for clean URLs or API proxying
  async rewrites() {
    return [
      // Add any URL rewrites here if needed
      // Example: Proxy to external API
      // {
      //   source: '/api/external/:path*',
      //   destination: 'https://external-api.com/:path*',
      // },
    ];
  },

  // Output configuration for deployment
  // output: 'standalone', // Uncomment for Docker deployments

  // PoweredByHeader
  poweredByHeader: false,

  // Compression
  compress: true,

  // Generate ETags for pages
  generateEtags: true,

  // Page extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],

  // Trailing slash configuration
  trailingSlash: false,

  // React strict mode
  reactStrictMode: true,

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
};

export default nextConfig;