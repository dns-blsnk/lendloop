# Intentionally empty

Next.js would treat `src/pages` (the Feature-Sliced Design layer) as the Pages Router if this root
folder did not exist. Routing lives in `/app`, which only re-exports pages from `src/pages`.
