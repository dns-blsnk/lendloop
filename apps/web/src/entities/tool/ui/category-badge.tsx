import { TOOL_CATEGORY_LABELS } from '@lendloop/contracts';

import { Badge } from '@/shared/ui/badge';

import type { ToolCategory } from '@lendloop/contracts';

export function CategoryBadge({ category }: { category: ToolCategory }) {
  return <Badge>{TOOL_CATEGORY_LABELS[category]}</Badge>;
}
