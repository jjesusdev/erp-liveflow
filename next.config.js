/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@whiskeysockets/baileys', 'prisma', '@prisma/client'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
