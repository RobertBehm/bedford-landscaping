// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Admin: must be signed in AND have org role
  if (isAdminRoute(req)) {
    await auth.protect({ role: "org:admin" });
    return;
  }

  // Dashboard: must be signed in
  if (isDashboardRoute(req)) {
    await auth.protect();
    return;
  }
});

export const config = {
  matcher: [
    // Run middleware on all routes except Next internals + common static assets
    "/((?!_next|.*\\.(?:css|js|json|png|jpg|jpeg|gif|svg|ico|webp|txt|xml|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
