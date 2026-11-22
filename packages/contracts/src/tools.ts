import { z } from 'zod';

import { boundedText } from './text';

export const ToolCategory = {
  POWER_TOOLS: 'power-tools',
  HAND_TOOLS: 'hand-tools',
  GARDEN: 'garden',
  KITCHEN: 'kitchen',
  CAMPING: 'camping',
  CLEANING: 'cleaning',
  LADDERS: 'ladders',
  OTHER: 'other',
} as const;

export type ToolCategory = (typeof ToolCategory)[keyof typeof ToolCategory];

export const TOOL_CATEGORY_LABELS: Readonly<Record<ToolCategory, string>> = {
  [ToolCategory.POWER_TOOLS]: 'Power tools',
  [ToolCategory.HAND_TOOLS]: 'Hand tools',
  [ToolCategory.GARDEN]: 'Garden',
  [ToolCategory.KITCHEN]: 'Kitchen',
  [ToolCategory.CAMPING]: 'Camping',
  [ToolCategory.CLEANING]: 'Cleaning',
  [ToolCategory.LADDERS]: 'Ladders',
  [ToolCategory.OTHER]: 'Other',
};

export const ToolCondition = {
  LIKE_NEW: 'like-new',
  GOOD: 'good',
  FAIR: 'fair',
  WORN: 'worn',
} as const;

export type ToolCondition = (typeof ToolCondition)[keyof typeof ToolCondition];

export const TOOL_CONDITION_LABELS: Readonly<Record<ToolCondition, string>> = {
  [ToolCondition.LIKE_NEW]: 'Like new',
  [ToolCondition.GOOD]: 'Good',
  [ToolCondition.FAIR]: 'Fair',
  [ToolCondition.WORN]: 'Worn but works',
};

/** Removed listings stay in the database so past loans and the audit log keep their tool. */
export const ToolStatus = {
  ACTIVE: 'active',
  REMOVED: 'removed',
} as const;

export type ToolStatus = (typeof ToolStatus)[keyof typeof ToolStatus];

/** What a viewer sees about a tool right now; derived from loans, never stored. */
export const Availability = {
  AVAILABLE: 'available',
  ON_LOAN: 'on-loan',
  OVERDUE: 'overdue',
} as const;

export type Availability = (typeof Availability)[keyof typeof Availability];

export const TOOL_NAME_MIN_LENGTH = 2;
export const TOOL_NAME_MAX_LENGTH = 60;
export const TOOL_DESCRIPTION_MAX_LENGTH = 500;

export const toolCategorySchema = z.enum(ToolCategory);
export const toolConditionSchema = z.enum(ToolCondition);
export const toolStatusSchema = z.enum(ToolStatus);
export const availabilitySchema = z.enum(Availability);

/** The fields an owner fills in; used by the listing form and by the create and update mutations. */
export const toolFieldsSchema = z.object({
  name: boundedText(TOOL_NAME_MIN_LENGTH, TOOL_NAME_MAX_LENGTH),
  category: toolCategorySchema,
  condition: toolConditionSchema,
  description: boundedText(0, TOOL_DESCRIPTION_MAX_LENGTH),
});

export type ToolFields = z.infer<typeof toolFieldsSchema>;

/**
 * The public page: name and category only, no owner details. The backend adds the tool id as a
 * list key; it says nothing about the owner.
 */
export const publicToolSchema = z.object({
  name: z.string(),
  category: toolCategorySchema,
});

export type PublicTool = z.infer<typeof publicToolSchema>;

/** What signed-in users see about a lender: no email, no account id. */
export const lenderSchema = z.object({
  name: z.string(),
  isTrustedLender: z.boolean(),
});

export type Lender = z.infer<typeof lenderSchema>;

/** A tool card for signed-in users. The backend adds the tool id. */
export const toolCardSchema = toolFieldsSchema.extend({
  availability: availabilitySchema,
  lender: lenderSchema,
  isMine: z.boolean(),
});

export type ToolCard = z.infer<typeof toolCardSchema>;

/** Most tools one list returns; the board is a neighbourhood, not a marketplace. */
export const MAX_TOOLS_PER_LIST = 200;
