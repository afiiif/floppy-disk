import type { Config } from '@react-router/dev/config';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: false,
  async prerender() {
    return ['/', '/store/zustand', '/store/floppy-disk', '/async/tanstack', '/async/floppy-disk'];
  },
} satisfies Config;
