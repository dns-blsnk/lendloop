import { clerkMiddleware } from '@clerk/nextjs/server';

// Attaches the Clerk session to every request. Access is decided per resource: Convex functions
// check the caller, and signed-in pages render a sign-in prompt for guests.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
