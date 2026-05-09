/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/proxy/:path*",
          destination: "https://financestreamai-backend.onrender.com/api/v1/:path*",
        },
      ],
    };
  },
};
module.exports = nextConfig;
