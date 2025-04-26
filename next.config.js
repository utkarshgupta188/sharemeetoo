/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports if needed
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configure rewrites to proxy API requests to the backend in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.NODE_ENV === "development" ? "http://localhost:3001/api/:path*" : "/api/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination:
          process.env.NODE_ENV === "development" ? "http://localhost:3001/socket.io/:path*" : "/socket.io/:path*",
      },
    ]
  },
}

module.exports = nextConfig
