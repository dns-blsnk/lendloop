'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loanDatesSchema, MAX_LOAN_DAYS } from '@lendloop/contracts';
import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { api } from '@/shared/api';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { CONTROL_CLASS, Field } from '@/shared/ui/field';

import type { Id } from '@/shared/api';
import type { IsoDate, LoanDates } from '@lendloop/contracts';

export function RequestLoanForm({ toolId, today }: { toolId: Id<'tools'>; today: IsoDate }) {
  const request = useMutation(api.loans.mutations.request);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<LoanDates>({
    resolver: zodResolver(loanDatesSchema),
    defaultValues: { startDate: today, endDate: today },
  });
  const { errors, isSubmitting, isDirty } = formState;

  // Past midnight the old default is in the past; move untouched dates to the new day.
  useEffect(() => {
    if (!isDirty) {
      reset({ startDate: today, endDate: today });
    }
  }, [today, isDirty, reset]);

  const submit = handleSubmit(async (dates) => {
    try {
      await request({ toolId, ...dates });
      setResult({ ok: true, text: 'Request sent. The owner will answer soon.' });
      reset({ startDate: today, endDate: today });
    } catch (error) {
      setResult({ ok: false, text: errorMessage(error) });
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="startDate" label="From" error={errors.startDate?.message}>
          <input
            id="startDate"
            type="date"
            min={today}
            className={CONTROL_CLASS}
            {...register('startDate')}
          />
        </Field>
        <Field id="endDate" label="Until (last day)" error={errors.endDate?.message}>
          <input
            id="endDate"
            type="date"
            min={today}
            className={CONTROL_CLASS}
            {...register('endDate')}
          />
        </Field>
      </div>
      <p className="text-sm text-muted">Up to {MAX_LOAN_DAYS} days. Dates are in UTC.</p>
      {result === null ? null : (
        <p
          role={result.ok ? 'status' : 'alert'}
          className={`text-sm ${result.ok ? 'text-accent' : 'text-red-700 dark:text-red-300'}`}
        >
          {result.text}
        </p>
      )}
      <div>
        <Button type="submit" disabled={isSubmitting}>
          Request to borrow
        </Button>
      </div>
    </form>
  );
}
