import { ToolCard } from './tool-card';

import type { ToolCard as ToolCardData } from '@lendloop/contracts';

export function ToolGrid({ tools }: { tools: readonly (ToolCardData & { id: string })[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <li key={tool.id}>
          <ToolCard tool={tool} href={`/tools/${tool.id}`} />
        </li>
      ))}
    </ul>
  );
}
