import type { Config } from '@react-router/dev/config';

export default {
  ssr: false,
  async prerender() {
    return ['/', '/store/zustand', '/store/floppy-disk', '/async/tanstack', '/async/floppy-disk'];
  },
  basename: '/floppy-disk',
} satisfies Config;
