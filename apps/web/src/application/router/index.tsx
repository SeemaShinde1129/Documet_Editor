export const appRoutes = {
  home: "/",
} as const;

export type AppRouteKey = keyof typeof appRoutes;
