import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('store/zustand', 'routes/store-zustand.tsx'),
  route('store/floppy-disk', 'routes/store-floppy-disk.tsx'),
  route('async/tanstack', 'routes/async-tanstack.tsx'),
  route('async/floppy-disk', 'routes/async-floppy-disk.tsx'),
] satisfies RouteConfig;
