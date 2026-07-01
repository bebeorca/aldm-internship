import {
  type RouteConfig,
  route,
  index,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/templates", "routes/dashboard/templates/index.tsx"),      // ← ditambah
    route("dashboard/templates/new", "routes/dashboard/templates/new.tsx"),    // ← ditambah
    route("letters", "routes/letters/index.tsx"),
    route("letters/create/mou", "routes/letters/mou.tsx"),
    route("letters/create/mou2", "routes/letters/mou2.tsx"),   // ← ditambah
    route("approval", "routes/approval/index.tsx"),
  ]),
] satisfies RouteConfig;