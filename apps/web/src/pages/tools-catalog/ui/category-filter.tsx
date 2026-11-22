'use client';

import { TOOL_CATEGORY_LABELS, ToolCategory, toolCategorySchema } from '@lendloop/contracts';
import { useRouter } from 'next/navigation';

import { useCurrentPath, useSearchParam } from '@/shared/lib/navigation';
import { CONTROL_CLASS } from '@/shared/ui/field';

const ALL = '';
const PARAM = 'category';

/** The category in the URL, so a filtered list can be shared and survives a reload. */
export function useCategoryFilter(): ToolCategory | undefined {
  const parsed = toolCategorySchema.safeParse(useSearchParam(PARAM));
  return parsed.success ? parsed.data : undefined;
}

export function CategoryFilter({ category }: { category: ToolCategory | undefined }) {
  const router = useRouter();
  const pathname = useCurrentPath();

  const choose = (next: string) => {
    // Keeps any other query parameters; only the category changes.
    const params = new URLSearchParams(window.location.search);
    if (next === ALL) {
      params.delete(PARAM);
    } else {
      params.set(PARAM, next);
    }
    const query = params.toString();
    router.replace(query === '' ? pathname : `${pathname}?${query}`);
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Category</span>
      <select
        className={`${CONTROL_CLASS} w-auto`}
        value={category ?? ALL}
        onChange={(event) => {
          choose(event.target.value);
        }}
      >
        <option value={ALL}>All categories</option>
        {Object.values(ToolCategory).map((value) => (
          <option key={value} value={value}>
            {TOOL_CATEGORY_LABELS[value]}
          </option>
        ))}
      </select>
    </label>
  );
}
