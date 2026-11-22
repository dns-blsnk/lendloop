// Plain-text email for one loan event. Uses only the fields Convex sent: first name, email,
// tool name, dates and status.
const event = $input.first().json.event;
const { toolName, startDate, endDate } = event.loan;
const dates = startDate === endDate ? startDate : `${startDate} to ${endDate}`;

const lines = {
  'loan.requested': [
    `Someone would like to borrow your ${toolName}`,
    `A neighbour asked to borrow your ${toolName} for ${dates}. Open LendLoop to approve or decline.`,
  ],
  'loan.approved': [
    `Your request for the ${toolName} was approved`,
    `Good news: the owner approved your request for ${dates}. Arrange the pick-up with them.`,
  ],
  'loan.declined': [
    `Your request for the ${toolName} was declined`,
    `The owner declined your request for ${dates}. Other neighbours may have one to lend.`,
  ],
  'loan.autoDeclined': [
    `Your request for the ${toolName} could not be accepted`,
    `The ${toolName} is not available for ${dates}, so your request was closed.`,
  ],
  'loan.cancelled': [
    `A loan of your ${toolName} was cancelled`,
    `The borrower cancelled the loan for ${dates}. The tool is free again for those days.`,
  ],
  'loan.withdrawn': [
    `Your loan of the ${toolName} was cancelled`,
    `The ${toolName} is no longer listed, so the loan for ${dates} was cancelled.`,
  ],
  'loan.returned': [
    `Thanks for returning the ${toolName}`,
    `The owner marked the ${toolName} as returned. Thank you for borrowing responsibly.`,
  ],
};

const [subject, body] = lines[event.type] ?? [
  'LendLoop update',
  'There is news about one of your loans.',
];

return [
  {
    json: {
      eventId: event.eventId,
      to: event.recipient.email,
      subject,
      text: `Hi ${event.recipient.firstName},\n\n${body}\n\n— LendLoop`,
    },
  },
];
