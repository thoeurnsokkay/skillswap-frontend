// /** @type {import('next').NextConfig} */
// module.exports = {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/files/:path*',
        destination: 'http://localhost:9090/:path*',
      },
    ]
  },
}

module.exports = nextConfig