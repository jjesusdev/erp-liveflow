/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@whiskeysockets/baileys', 'prisma', '@prisma/client'],
};

module.exports = nextConfig;
