'use client';

import React from 'react';
import { lookupFor, resultText } from '../tool-definition';
import { type ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  const valid = lookupFor(state) !== null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex flex-1 items-center gap-2"
        role="group"
        aria-label="Unicode inspector controls"
      >
        <input
          type="text"
          value={state.query}
          onChange={(e) => onChange({ ...state, query: e.target.value })}
          placeholder="Paste a character, U+1F600, 128512…"
          aria-label="Character or codepoint lookup"
          data-testid="toolbar-query"
          className={`w-full max-w-md rounded-md border px-3 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 ${
            valid ? 'border-gray-300 dark:border-gray-700' : 'border-red-400 dark:border-red-600'
          }`}
        />
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            disabled={!valid}
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            Copy result
          </button>
        ) : null}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400" data-testid="toolbar-summary">
        {resultText(state)}
      </span>
    </div>
  );
};
