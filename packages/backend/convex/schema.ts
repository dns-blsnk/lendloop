import { defineSchema } from 'convex/server';

import { usersTables } from './users/tables';

export default defineSchema({
  ...usersTables,
});
