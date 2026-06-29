// app/routes.ts
import {
  type RouteConfig,
  route,
  index,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    // index("routes/dashboard/index.tsx"),
    route("dashboard", "routes/dashboard/index.tsx"),
    route("letters", "routes/letters/index.tsx"),
    route("letters/create/mou", "routes/letters/mou.tsx"),
    // route("letters/:id", "routes/letters/$id/index.tsx"),
    route("approval", "routes/approval/index.tsx"),
    // route("sync", "routes/sync/index.tsx"),
    // route("settings/signature", "routes/settings/signature.tsx"),
  ]),
] satisfies RouteConfig;