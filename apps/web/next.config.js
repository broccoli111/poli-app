/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@poli/ui', '@poli/lib', '@poli/types'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
