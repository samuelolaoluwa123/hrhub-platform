/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 92 used by BrowserFrame (components/marketing/BrowserFrame.jsx) for
    // sharper text-heavy product screenshots — 75 is next/image's default
    // and stays available for everything else.
    qualities: [75, 92],
  },
};

export default nextConfig;
