// The empty root `pages/` folder makes Next type the navigation hooks as nullable through the
// generated, gitignored `next-env.d.ts`. Referencing the same types here keeps lint and typecheck
// identical on a fresh checkout (CI lints before `next build` generates that file).
/// <reference types="next/navigation-types/compat/navigation" />
