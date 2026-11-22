import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  parseLookup,
  resultText,
  unicodeName,
  encodingsFor,
  blockFor,
  planeFor,
  categoryFor,
  inspectString,
  neighbours,
  type HistoryEntry,
  type ToolState,
} from './types';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    query: state.query,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected Unicode character inspector state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    query: stringOr(v.query, DEFAULT_STATE.query),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Full lookup result for a state, or null when the query is invalid. */
export function lookupFor(state: ToolState) {
  const parsed = parseLookup(state.query);
  if (!parsed) return null;
  return {
    parsed,
    encodings: encodingsFor(parsed.cp),
    name: unicodeName(parsed.cp),
    block: blockFor(parsed.cp),
    plane: planeFor(parsed.cp),
    category: categoryFor(parsed.cp),
    neighbours: neighbours(parsed.cp),
  };
}

export const unicodeInspectorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  parseLookup,
  resultText,
  unicodeName,
  encodingsFor,
  blockFor,
  planeFor,
  categoryFor,
  inspectString,
  neighbours,
};
