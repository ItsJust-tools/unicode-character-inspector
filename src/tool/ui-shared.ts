import { DEFAULT_STATE, type ToolState } from './types';

export const TOOL_TITLE = 'Unicode Character Inspector';

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.query === 'string';
}

export { DEFAULT_STATE };
