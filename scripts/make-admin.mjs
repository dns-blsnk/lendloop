// Gives the admin role to the account that signed in with this email: pnpm make-admin you@example.com
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const email = process.argv[2];
if (email === undefined || !email.includes('@')) {
  console.error('Usage: pnpm make-admin <email of an account that has signed in>');
  process.exit(1);
}
execFileSync(
  'npx',
  ['convex', 'run', 'users/internal:setRole', JSON.stringify({ email, role: 'admin' })],
  { cwd: join(import.meta.dirname, '..', 'packages/backend'), stdio: 'inherit' },
);
