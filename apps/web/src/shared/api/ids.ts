import type { Id } from '@lendloop/backend/dataModel';

/**
 * Treats a route segment as a document id. The backend validates every id it receives, so a
 * malformed one is rejected there; this only satisfies the type checker.
 */
export function asId<Table extends 'tools' | 'loans' | 'users'>(raw: string): Id<Table> {
  return raw as Id<Table>;
}
