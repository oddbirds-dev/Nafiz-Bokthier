import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  devIndicators: false,
  // Lets other devices on the local network open the dev server at this PC's LAN address.
  allowedDevOrigins: ["192.168.0.209"],
}

export default nextConfig
