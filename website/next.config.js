const nextra = require("nextra");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["page.tsx"],

  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/docs/getting-started",
        permanent: false,
      },
      {
        source: "/docs/sync/store",
        destination: "/docs/store",
        permanent: false,
      },
      {
        source: "/docs/sync/stores",
        destination: "/docs/stores",
        permanent: false,
      },
      {
        source: "/docs/async/query",
        destination: "/docs/query",
        permanent: false,
      },
      {
        source: "/docs/async/mutation",
        destination: "/docs/mutation",
        permanent: false,
      },
    ];
  },
};

/** @type {import('nextra').NextraConfig} */
const nextraConfig = {
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
  flexsearch: { codeblocks: false },
  defaultShowCopyCode: true,
};

module.exports = nextra(nextraConfig)(nextConfig);
