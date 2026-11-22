'use client';

import { useRef } from 'react';

import type { KeyboardEvent } from 'react';

export interface Tab {
  id: string;
  label: string;
}

const STEP: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 };

/** WAI-ARIA tabs: arrow keys move between tabs, and each tab names its panel. */
export function AdminTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly Tab[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent) => {
    const step = STEP[event.key];
    if (step === undefined) {
      return;
    }
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (next !== undefined) {
      onSelect(next.id);
      refs.current.get(next.id)?.focus();
    }
  };

  return (
    <div role="tablist" aria-label="Admin sections" className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(node) => {
            if (node === null) {
              refs.current.delete(tab.id);
            } else {
              refs.current.set(tab.id, node);
            }
          }}
          id={`tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          aria-controls={`panel-${tab.id}`}
          tabIndex={tab.id === active ? 0 : -1}
          onClick={() => {
            onSelect(tab.id);
          }}
          onKeyDown={onKeyDown}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab.id === active ? 'border-accent font-medium' : 'border-transparent text-muted'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
