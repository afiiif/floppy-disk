import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("store/zustand", "routes/store-zustand.tsx"),
  route("store/yuustate", "routes/store-yuustate.tsx"),
  route("async/tanstack", "routes/async-tanstack.tsx"),
  route("async/yuustate", "routes/async-yuustate.tsx"),
  route("stream", "routes/stream.tsx"),
] satisfies RouteConfig;
