'use client';

import React from 'react';
import { type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

const EXAMPLES: { label: string; value: string }[] = [
  { label: 'A', value: 'A' },
  { label: '€', value: '€' },
  { label: '😀 U+1F600', value: 'U+1F600' },
  { label: '128512 (decimal)', value: '128512' },
  { label: '中 CJK', value: '中' },
  { label: '→ U+2192', value: 'U+2192' },
];

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="space-y-6 overflow-y-auto p-4 text-sm" data-testid="unicode-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Accepted input</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Pasted character — first codepoint is inspected</li>
          <li>
            <code>U+1F600</code> or <code>u+1f600</code> — codepoint notation
          </li>
          <li>
            Hex like <code>1F600</code> or <code>0x1F600</code>
          </li>
          <li>
            Decimal like <code>128512</code>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Quick examples</h3>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.value}
              type="button"
              onClick={() => onChange({ ...state, query: ex.value })}
              data-testid={`example-${ex.value.replace(/[^0-9a-z]/gi, '-') || 'char'}`}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved lookups</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
        {state.history.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
            {state.history.slice(0, 8).map((entry, i) => (
              <li key={`${entry.createdAt}-${i}`} className="truncate">
                {entry.text}
              </li>
            ))}
          </ul>
        ) : null}
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="sidebar-clear-history"
            className="mt-2 rounded-md bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear history
          </button>
        ) : null}
      </div>
    </div>
  );
};
