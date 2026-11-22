// Asks Convex for today's reminders. The body is empty on purpose: Convex decides which day it is.
const { loans } = await postToConvex(this.helpers, '/n8n/overdue-loans', {});
return loans.map((loan) => ({ json: loan }));
