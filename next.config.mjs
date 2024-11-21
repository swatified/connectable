/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**.tenor.com',
        },
        {
          protocol: 'https',
          hostname: '**.googleapis.com',
        }
      ],
    },
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,POST' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
          ],
        },
      ];
    }
  };
  
  export default nextConfig;