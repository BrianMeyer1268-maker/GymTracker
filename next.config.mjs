/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is a fully client-side app (localStorage only); skip lint blocking builds.
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
};

export default nextConfig;
