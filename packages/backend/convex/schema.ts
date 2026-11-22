import { defineSchema } from 'convex/server';

import { auditTables } from './audit/tables';
import { loansTables } from './loans/tables';
import { toolsTables } from './tools/tables';
import { usersTables } from './users/tables';

export default defineSchema({
  ...usersTables,
  ...toolsTables,
  ...loansTables,
  ...auditTables,
});
