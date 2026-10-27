import type { NextConfig } from "next";

// 이 PC는 보안 정책으로 Turbopack 네이티브 바이너리가 막혀 있어 Webpack(--webpack)으로 빌드합니다.
const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
