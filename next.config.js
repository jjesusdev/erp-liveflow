/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite usar el dev server desde el celular vía Cloudflare Quick Tunnel
  // (npm run dev:phone). Sin esto Next bloquea los assets cross-origin en dev.
  allowedDevOrigins: ["*.trycloudflare.com"],
  serverExternalPackages: ["@whiskeysockets/baileys", "prisma", "@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
