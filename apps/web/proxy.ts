import { clerkMiddleware } from '@clerk/nextjs/server';

// Attaches the Clerk session to every request. Pages decide what to show; the Convex backend
// enforces access on its own, so nothing here is a security boundary.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
