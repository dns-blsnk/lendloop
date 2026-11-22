return $input.all().map((item) => {
  const loan = item.json;
  const days = loan.daysOverdue === 1 ? '1 day' : `${loan.daysOverdue} days`;
  return {
    json: {
      loanId: loan.loanId,
      reminderKey: loan.reminderKey,
      to: loan.borrower.email,
      subject: `Reminder: please return the ${loan.toolName}`,
      text:
        `Hi ${loan.borrower.firstName},\n\n` +
        `The ${loan.toolName} was due back on ${loan.endDate} (${days} ago). ` +
        `Please return it to its owner, who will mark it returned in LendLoop.\n\n— LendLoop`,
    },
  };
});
