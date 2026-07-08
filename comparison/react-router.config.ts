import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  async prerender() {
    return [
      "/",
      "/store/zustand",
      "/store/yuustate",
      "/async/tanstack",
      "/async/yuustate",
      "/stream",
    ];
  },
  ...(process.env.NODE_ENV === "production"
    ? {
        basename: "/yuustate",
      }
    : {}),
} satisfies Config;
