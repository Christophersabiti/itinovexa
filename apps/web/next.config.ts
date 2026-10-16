import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    '@itinovexa/audit',
    '@itinovexa/db',
    '@itinovexa/money',
    '@itinovexa/shared',
    '@itinovexa/tenancy',
  ],
};

export default nextConfig;
