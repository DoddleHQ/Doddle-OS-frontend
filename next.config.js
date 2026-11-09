const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      { source: '/workspaces', destination: '/legacy/workspaces', permanent: false },
      { source: '/workspaces/:path*', destination: '/legacy/workspaces/:path*', permanent: false },
    ];
  },
};

module.exports = nextConfig;
