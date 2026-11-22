import { Availability } from '@lendloop/contracts';

import { Badge } from '@/shared/ui/badge';

import type { BadgeTone } from '@/shared/ui/badge';

const LOOK: Readonly<Record<Availability, { label: string; tone: BadgeTone }>> = {
  [Availability.AVAILABLE]: { label: 'Available', tone: 'accent' },
  [Availability.ON_LOAN]: { label: 'On loan', tone: 'warning' },
  [Availability.OVERDUE]: { label: 'Overdue', tone: 'danger' },
};

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const { label, tone } = LOOK[availability];
  return <Badge tone={tone}>{label}</Badge>;
}
