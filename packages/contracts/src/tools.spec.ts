import { describe, expect, it } from 'vitest';

import {
  TOOL_CATEGORY_LABELS,
  TOOL_CONDITION_LABELS,
  TOOL_NAME_MAX_LENGTH,
  ToolCategory,
  ToolCondition,
  toolFieldsSchema,
} from './tools';

const valid = {
  name: 'Cordless drill',
  category: ToolCategory.POWER_TOOLS,
  condition: ToolCondition.GOOD,
  description: 'Two batteries included.',
};

describe('toolFieldsSchema', () => {
  it('trims text fields', () => {
    expect(toolFieldsSchema.parse({ ...valid, name: '  Drill  ' }).name).toBe('Drill');
  });

  it('rejects names that are blank or too long', () => {
    expect(toolFieldsSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    const long = 'x'.repeat(TOOL_NAME_MAX_LENGTH + 1);
    expect(toolFieldsSchema.safeParse({ ...valid, name: long }).success).toBe(false);
  });

  it('rejects unknown categories and conditions', () => {
    expect(toolFieldsSchema.safeParse({ ...valid, category: 'boats' }).success).toBe(false);
    expect(toolFieldsSchema.safeParse({ ...valid, condition: 'mint' }).success).toBe(false);
  });

  it('has a label for every category and condition', () => {
    expect(Object.keys(TOOL_CATEGORY_LABELS).sort()).toEqual(Object.values(ToolCategory).sort());
    expect(Object.keys(TOOL_CONDITION_LABELS).sort()).toEqual(Object.values(ToolCondition).sort());
  });
});

describe('text length', () => {
  it('counts an emoji as one character', () => {
    const name = '🔨'.repeat(TOOL_NAME_MAX_LENGTH);
    expect(toolFieldsSchema.safeParse({ ...valid, name }).success).toBe(true);
  });
});
