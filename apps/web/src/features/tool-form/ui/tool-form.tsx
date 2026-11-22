'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  TOOL_CATEGORY_LABELS,
  TOOL_CONDITION_LABELS,
  TOOL_DESCRIPTION_MAX_LENGTH,
  ToolCategory,
  ToolCondition,
  toolFieldsSchema,
} from '@lendloop/contracts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { CONTROL_CLASS, Field } from '@/shared/ui/field';

import type { ToolFields } from '@lendloop/contracts';
import type { z } from 'zod';

const EMPTY: z.input<typeof toolFieldsSchema> = {
  name: '',
  category: ToolCategory.POWER_TOOLS,
  condition: ToolCondition.GOOD,
  description: '',
};

/** The listing form for both "list a tool" and "edit"; the same schema validates on the server. */
export function ToolForm({
  initial = EMPTY,
  submitLabel,
  onSubmit,
}: {
  initial?: z.input<typeof toolFieldsSchema>;
  submitLabel: string;
  onSubmit: (fields: ToolFields) => Promise<void>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<
    z.input<typeof toolFieldsSchema>,
    unknown,
    ToolFields
  >({ resolver: zodResolver(toolFieldsSchema), defaultValues: initial });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (fields) => {
    setServerError(null);
    try {
      await onSubmit(fields);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex max-w-xl flex-col gap-4"
      noValidate
    >
      <Field id="name" label="Name" error={errors.name?.message}>
        <input
          id="name"
          className={CONTROL_CLASS}
          aria-invalid={errors.name !== undefined}
          {...register('name')}
        />
      </Field>
      <Field id="category" label="Category" error={errors.category?.message}>
        <select id="category" className={CONTROL_CLASS} {...register('category')}>
          {Object.values(ToolCategory).map((category) => (
            <option key={category} value={category}>
              {TOOL_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="condition" label="Condition" error={errors.condition?.message}>
        <select id="condition" className={CONTROL_CLASS} {...register('condition')}>
          {Object.values(ToolCondition).map((condition) => (
            <option key={condition} value={condition}>
              {TOOL_CONDITION_LABELS[condition]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="description" label="Short description" error={errors.description?.message}>
        <textarea
          id="description"
          rows={4}
          maxLength={TOOL_DESCRIPTION_MAX_LENGTH}
          className={CONTROL_CLASS}
          {...register('description')}
        />
      </Field>
      {serverError === null ? null : (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {serverError}
        </p>
      )}
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
