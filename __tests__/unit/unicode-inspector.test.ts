import { describe, it, expect } from 'vitest';
import {
  parseLookup,
  unicodeName,
  encodingsFor,
  blockFor,
  planeFor,
  categoryFor,
  inspectString,
  neighbours,
  resultText,
  summaryText,
  DEFAULT_STATE,
  MAX_HISTORY,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  withHistory,
  roundTrips,
  lookupFor,
  unicodeInspectorTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseLookup', () => {
  it('accepts U+ codepoint notation in any case', () => {
    expect(parseLookup('U+0041')?.cp).toBe(0x41);
    expect(parseLookup('u+1f600')?.cp).toBe(0x1f600);
    expect(parseLookup('U+10FFFF')?.cp).toBe(0x10ffff);
  });

  it('accepts plain hex, 0x-prefixed hex, and decimal values', () => {
    expect(parseLookup('0041')?.cp).toBe(0x41);
    expect(parseLookup('0x41')?.cp).toBe(0x41);
    expect(parseLookup('128512')?.cp).toBe(0x1f600);
    expect(parseLookup('1F600')?.cp).toBe(0x1f600);
  });

  it('treats pasted characters/strings as their first codepoint', () => {
    expect(parseLookup('A')?.form).toBe('character');
    expect(parseLookup('ab😀')?.cp).toBe(0x61);
    expect(parseLookup('😀')?.cp).toBe(0x1f600);
  });

  it('rejects empty, invalid, and out-of-range input', () => {
    expect(parseLookup('')).toBeNull();
    expect(parseLookup('   ')).toBeNull();
    expect(parseLookup('U+')).toBeNull();
    expect(parseLookup('U+110000')).toBeNull();
    expect(parseLookup('😀'.repeat(3))).toEqual(parseLookup('😀'));
    expect(parseLookup('-1')?.cp).toBe(0x2d); // first codepoint of plain text wins
  });
});

describe('encodingsFor', () => {
  it('computes ASCII encodings', () => {
    const enc = encodingsFor(0x41);
    expect(enc.hexCodepoint).toBe('U+0041');
    expect(enc.decimal).toBe('65');
    expect(enc.utf8).toBe('0x41');
    expect(enc.utf16).toBe('U+0041');
    expect(enc.htmlEntity).toBe('&#65;');
    expect(enc.jsEscape).toBe('\\u0041');
    expect(enc.urlEncoded).toBe('A');
  });

  it('computes multi-byte UTF-8 for BMP characters', () => {
    const enc = encodingsFor(0x20ac); // €
    expect(enc.utf8).toBe('0xE2 0x82 0xAC');
    expect(enc.utf16).toBe('U+20AC');
    expect(enc.htmlEntity).toBe('&#8364;');
  });

  it('computes UTF-16 surrogate pairs and 4-byte UTF-8 for astral characters', () => {
    const enc = encodingsFor(0x1f600); // 😀
    expect(enc.utf16).toBe('U+D83D U+DE00');
    expect(enc.utf8).toBe('0xF0 0x9F 0x98 0x80');
    expect(enc.jsEscape).toBe('\\u{1F600}');
    expect(enc.htmlEntity).toBe('&#128512;');
  });

  it('escapes ampersand as HTML entity', () => {
    expect(encodingsFor(0x26).htmlEntity).toBe('&amp;');
  });
});

describe('metadata helpers', () => {
  it('names well-known characters and labels others by block', () => {
    expect(unicodeName(0x41)).toBe('LATIN CAPITAL LETTER A');
    expect(unicodeName(0x1f600)).toBe('GRINNING FACE');
    expect(unicodeName(0x20a0)).toContain('Currency Symbols');
  });

  it('identifies blocks and planes', () => {
    expect(blockFor(0x2a)).toBe('Basic Latin');
    expect(blockFor(0x4e2d)).toBe('CJK Unified Ideographs');
    expect(blockFor(0x1f600)).toBe('Emoticons');
    expect(blockFor(0x10000)).toBeNull();
    expect(planeFor(0x41)).toBe('Basic Multilingual Plane (BMP)');
    expect(planeFor(0x1f600)).toBe('Supplementary Plane 1 (SPD-1)');
  });

  it('categorizes characters', () => {
    expect(categoryFor(0x41)).toBe('Letter (uppercase)');
    expect(categoryFor(0x39)).toBe('Number (digit)');
    expect(categoryFor(0x1f600)).toBe('Symbol (emoji / pictograph)');
    expect(categoryFor(0x0a)).toBe('Separator (control format)');
  });
});

describe('inspectString and neighbours', () => {
  it('lists every codepoint of a string including surrogate pairs', () => {
    const chars = inspectString('a😀b');
    expect(chars).toHaveLength(3);
    expect(chars.map((c) => c.cp)).toEqual([0x61, 0x1f600, 0x62]);
  });

  it('returns neighbours excluding the lookup itself', () => {
    const n = neighbours(0x41, 3);
    expect(n).toHaveLength(6);
    expect(n.some((x) => x.cp === 0x41)).toBe(false);
  });
});

describe('state helpers', () => {
  it('produces result and summary text for valid input', () => {
    expect(resultText(state({ query: 'A' }))).toBe('U+0041 — LATIN CAPITAL LETTER A');
    expect(resultText(state({ query: 'U+' }))).toBeNull();
    expect(summaryText(state({ query: 'A' }))).toContain('U+0041');
    expect(summaryText(state({ query: '' }))).toContain('Enter a character');
  });

  it('round-trips state through serialize/deserialize', () => {
    const s = state({ query: '😀', history: [{ text: 'x', createdAt: 'now' }] });
    expect(roundTrips(s)).toBe(true);
    expect(JSON.parse(serializeState(s))).toEqual({ query: '😀', history: s.history });
  });

  it('caps history at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i += 1) {
      s = withHistory(s, `entry-${i}`, new Date('2026-01-01T00:00:00Z'));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`entry-${MAX_HISTORY + 4}`);
  });

  it('repairs invalid serialized payloads', () => {
    const result = deserializeState({ query: 42, history: 'nope', extra: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe(DEFAULT_STATE.query);
      expect(result.data.history).toEqual([]);
    }
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1]).success).toBe(false);
  });

  it('exposes the tool definition with exporter formats', () => {
    expect(unicodeInspectorTool.id).toBe('unicode-character-inspector');
    expect(lookupFor(state({ query: 'A' }))?.name).toBe('LATIN CAPITAL LETTER A');
    expect(lookupFor(state({ query: 'U+' }))).toBeNull();
  });
});
