'use client';

import React from 'react';
import { lookupFor, inspectString } from '../tool-definition';
import type { ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const encodingRowClass =
  'flex items-center justify-between gap-3 border-b border-gray-100 py-2 text-sm dark:border-gray-800';
const labelClass = 'font-mono text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state }) => {
  const lookup = lookupFor(state);

  if (!lookup) {
    return (
      <div className="p-8 text-center" data-testid="canvas-error">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl dark:bg-gray-800">
          ?
        </div>
        <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          Unknown character or codepoint
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter a character, a <code>U+1F600</code> codepoint, a hex value like <code>1F600</code>,
          or a decimal value like <code>128512</code>. Codepoints must be between 0 and U+10FFFF.
        </p>
      </div>
    );
  }

  const { parsed, encodings, name, block, plane, category, neighbours } = lookup;
  const rows: { label: string; value: string; testid: string }[] = [
    { label: 'Codepoint', value: encodings.hexCodepoint, testid: 'enc-codepoint' },
    { label: 'Decimal', value: encodings.decimal, testid: 'enc-decimal' },
    { label: 'UTF-8', value: encodings.utf8, testid: 'enc-utf8' },
    { label: 'UTF-16', value: encodings.utf16, testid: 'enc-utf16' },
    { label: 'HTML entity', value: encodings.htmlEntity, testid: 'enc-html' },
    { label: 'CSS escape', value: encodings.cssEscape.trim(), testid: 'enc-css' },
    { label: 'JS escape', value: encodings.jsEscape, testid: 'enc-js' },
    { label: 'URL encoded', value: encodings.urlEncoded, testid: 'enc-url' },
  ];
  const stringChars = inspectString(state.query);

  return (
    <div className="space-y-6 p-4" data-testid="unicode-canvas">
      <div className="flex items-center gap-6">
        <div
          data-testid="char-display"
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-5xl dark:border-gray-700 dark:bg-gray-800"
        >
          {parsed.char}
        </div>
        <div className="min-w-0">
          <h2
            className="truncate text-lg font-medium text-gray-900 dark:text-gray-100"
            data-testid="char-name"
          >
            {name}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400" data-testid="char-meta">
            {category}
            {block ? ` · ${block}` : ''} · {plane}
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Encodings</h3>
        <div data-testid="encodings-table">
          {rows.map((row) => (
            <div key={row.label} className={encodingRowClass}>
              <span className={labelClass}>{row.label}</span>
              <span className="flex items-center gap-2 font-mono text-sm" data-testid={row.testid}>
                <span className="break-all">{row.value}</span>
                <CopyButton value={row.value} testid={`${row.testid}-copy`} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {stringChars.length > 1 ? (
        <section>
          <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            String inspector ({stringChars.length} codepoints)
          </h3>
          <table className="w-full text-left text-sm" data-testid="string-table">
            <thead>
              <tr className="text-xs uppercase text-gray-500 dark:text-gray-400">
                <th className="py-1 pr-4">Char</th>
                <th className="py-1 pr-4">Codepoint</th>
                <th className="py-1">Name</th>
              </tr>
            </thead>
            <tbody>
              {stringChars.map((info, i) => (
                <tr
                  key={`${info.cp}-${i}`}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="py-1 pr-4 text-xl">{info.char}</td>
                  <td className="py-1 pr-4 font-mono text-xs">
                    U+{info.cp.toString(16).toUpperCase().padStart(4, '0')}
                  </td>
                  <td className="py-1 text-gray-600 dark:text-gray-400">{info.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          Nearby characters
        </h3>
        <div className="flex flex-wrap gap-2" data-testid="neighbours">
          {neighbours.map((n) => (
            <span
              key={n.cp}
              title={`${n.name} (U+${n.cp.toString(16).toUpperCase().padStart(4, '0')})`}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-2xl dark:border-gray-700 dark:bg-gray-800"
            >
              {n.char}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
