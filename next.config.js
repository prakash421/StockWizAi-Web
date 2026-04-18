/** @type {import('next').NextConfig} */
const nextConfig = {
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
