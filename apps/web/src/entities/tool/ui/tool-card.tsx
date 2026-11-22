import { TOOL_CONDITION_LABELS } from '@lendloop/contracts';
import Link from 'next/link';

import { Card } from '@/shared/ui/card';

import { AvailabilityBadge } from './availability-badge';
import { CategoryBadge } from './category-badge';
import { LenderName } from './lender-name';

import type { ToolCard as ToolCardData } from '@lendloop/contracts';

export function ToolCard({ tool, href }: { tool: ToolCardData; href: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="font-medium hover:underline">
          {tool.name}
        </Link>
        <AvailabilityBadge availability={tool.availability} />
      </div>
      <div className="flex flex-wrap gap-2">
        <CategoryBadge category={tool.category} />
        <span className="text-xs text-muted">{TOOL_CONDITION_LABELS[tool.condition]}</span>
      </div>
      {tool.isMine ? (
        <span className="text-sm text-muted">Your listing</span>
      ) : (
        <LenderName lender={tool.lender} />
      )}
    </Card>
  );
}
