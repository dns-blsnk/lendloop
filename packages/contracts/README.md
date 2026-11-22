# @lendloop/contracts

Single source of truth shared by the web app, the Convex backend and the n8n integration:
domain constants, the permission matrix, error codes, zod schemas for inputs and outputs, and
the signed payloads exchanged with n8n.

The package ships TypeScript source (no build step): Next.js compiles it through
`transpilePackages`, and the Convex bundler compiles it with the functions.
