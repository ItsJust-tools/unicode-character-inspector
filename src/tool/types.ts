export interface HistoryEntry {
  /** Short human readable description of the lookup. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** The current lookup query: a pasted character, U+ codepoint, hex, or decimal. */
  query: string;
  /** Saved lookup history, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  query: 'U+0041',
  history: [],
};

export const MAX_HISTORY = 20;

export interface ParsedLookup {
  /** The character this lookup resolves to (may be a surrogate pair as a JS string). */
  char: string;
  /** Unicode codepoint value. */
  cp: number;
  /** Which input form matched. */
  form: 'character' | 'u-plus' | 'hex' | 'decimal';
}

/**
 * Parse a lookup query into a codepoint.
 * Accepts a pasted character (first codepoint wins), "U+1F600"/"u+1f600",
 * a bare hex string ("1F600", "0x1F600") or a decimal number ("128512").
 * Returns null for empty or out-of-range input (values above U+10FFFF are invalid).
 */
export function parseLookup(input: string): ParsedLookup | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uPlusMatch = /^u\+([0-9a-f]+)$/i.exec(trimmed);
  if (/^u\+/i.test(trimmed)) {
    if (!uPlusMatch) return null;
    return fromCodepoint(parseInt(uPlusMatch[1] ?? '', 16), 'u-plus');
  }

  const hexMatch = /^(?:0x)?([0-9a-f]+)$/i.exec(trimmed);
  const decimalMatch = /^\d+$/;

  if (hexMatch && /^0x/i.test(trimmed)) {
    return fromCodepoint(parseInt(hexMatch[1] ?? '', 16), 'hex');
  }

  // Hex with multiple letters (e.g. "1F600"): unambiguous codepoint input.
  // A single letter like "A" is treated as a pasted character below.
  if (hexMatch && /[a-f]/i.test(trimmed) && trimmed.length > 1) {
    return fromCodepoint(parseInt(hexMatch[1] ?? '', 16), 'hex');
  }

  // All-digit strings: leading-zero multi-digit strings read as hex codepoints,
  // otherwise decimal.
  if (decimalMatch.test(trimmed)) {
    if (trimmed.length > 1 && trimmed.startsWith('0')) {
      return fromCodepoint(parseInt(trimmed, 16), 'hex');
    }
    return fromCodepoint(parseInt(trimmed, 10), 'decimal');
  }

  // Multi-character non-codepoint text: take the first codepoint.
  const points = Array.from(trimmed);
  const cp = points[0]?.codePointAt(0) as number;
  return fromCodepoint(cp, 'character');
}

function fromCodepoint(cp: number, form: ParsedLookup['form']): ParsedLookup | null {
  if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return null;
  return { char: String.fromCodePoint(cp), cp, form };
}

export interface Encodings {
  hexCodepoint: string;
  decimal: string;
  utf8: string;
  utf16: string;
  htmlEntity: string;
  cssEscape: string;
  jsEscape: string;
  urlEncoded: string;
}

/** All encoding representations for a codepoint. */
export function encodingsFor(cp: number): Encodings {
  const char = String.fromCodePoint(cp);
  const units: number[] = [];
  if (cp < 0x10000) {
    units.push(cp);
  } else {
    units.push(0xd800 + ((cp - 0x10000) >> 10));
    units.push(0xdc00 + ((cp - 0x10000) & 0x3ff));
  }
  const bytes: number[] = [];
  if (cp < 0x80) {
    bytes.push(cp);
  } else if (cp < 0x800) {
    bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
  } else if (cp < 0x10000) {
    bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  } else {
    bytes.push(
      0xf0 | (cp >> 18),
      0x80 | ((cp >> 12) & 0x3f),
      0x80 | ((cp >> 6) & 0x3f),
      0x80 | (cp & 0x3f)
    );
  }
  const hex = (n: number, pad = 2) => n.toString(16).toUpperCase().padStart(pad, '0');
  const cpHex = hex(cp, 4);
  return {
    hexCodepoint: `U+${cpHex}`,
    decimal: String(cp),
    utf8: bytes.map((b) => `0x${hex(b)}`).join(' '),
    utf16: units.map((u) => `U+${hex(u, 4)}`).join(' '),
    htmlEntity: cp === 0x26 ? '&amp;' : `&#${cp};`,
    cssEscape: `\\${cpHex}${cp < 0x100000 ? ' ' : ''}`,
    jsEscape: cp < 0x10000 ? `\\u${hex(cp, 4)}` : `\\u{${cpHex}}`,
    urlEncoded: encodeURIComponent(char),
  };
}

/** Well-known Unicode block ranges used for block / script hints. */
const BLOCKS: { start: number; end: number; name: string }[] = [
  { start: 0x0000, end: 0x007f, name: 'Basic Latin' },
  { start: 0x0080, end: 0x00ff, name: 'Latin-1 Supplement' },
  { start: 0x0100, end: 0x017f, name: 'Latin Extended-A' },
  { start: 0x0180, end: 0x024f, name: 'Latin Extended-B' },
  { start: 0x0370, end: 0x03ff, name: 'Greek and Coptic' },
  { start: 0x0400, end: 0x04ff, name: 'Cyrillic' },
  { start: 0x0590, end: 0x05ff, name: 'Hebrew' },
  { start: 0x0600, end: 0x06ff, name: 'Arabic' },
  { start: 0x0900, end: 0x097f, name: 'Devanagari' },
  { start: 0x1e00, end: 0x1eff, name: 'Latin Extended Additional' },
  { start: 0x2000, end: 0x206f, name: 'General Punctuation' },
  { start: 0x20a0, end: 0x20cf, name: 'Currency Symbols' },
  { start: 0x2100, end: 0x214f, name: 'Letterlike Symbols' },
  { start: 0x2190, end: 0x21ff, name: 'Arrows' },
  { start: 0x2200, end: 0x22ff, name: 'Mathematical Operators' },
  { start: 0x2300, end: 0x23ff, name: 'Miscellaneous Technical' },
  { start: 0x2500, end: 0x257f, name: 'Box Drawing' },
  { start: 0x25a0, end: 0x25ff, name: 'Geometric Shapes' },
  { start: 0x2600, end: 0x26ff, name: 'Miscellaneous Symbols' },
  { start: 0x2700, end: 0x27bf, name: 'Dingbats' },
  { start: 0x2c60, end: 0x2cff, name: 'Latin Extended-C' },
  { start: 0x3000, end: 0x303f, name: 'CJK Symbols and Punctuation' },
  { start: 0x3040, end: 0x309f, name: 'Hiragana' },
  { start: 0x30a0, end: 0x30ff, name: 'Katakana' },
  { start: 0x4e00, end: 0x9fff, name: 'CJK Unified Ideographs' },
  { start: 0xa000, end: 0xa4cf, name: 'Yi Syllables' },
  { start: 0xac00, end: 0xd7af, name: 'Hangul Syllables' },
  { start: 0xf900, end: 0xfaff, name: 'CJK Compatibility Ideographs' },
  { start: 0xfb00, end: 0xfb4f, name: 'Alphabetic Presentation Forms' },
  { start: 0xfe00, end: 0xfe0f, name: 'Variation Selectors' },
  { start: 0xfe70, end: 0xfeff, name: 'Arabic Presentation Forms-B' },
  { start: 0xff00, end: 0xffef, name: 'Halfwidth and Fullwidth Forms' },
  { start: 0x1d400, end: 0x1d7ff, name: 'Mathematical Alphanumeric Symbols' },
  { start: 0x1f300, end: 0x1f5ff, name: 'Miscellaneous Symbols and Pictographs' },
  { start: 0x1f600, end: 0x1f64f, name: 'Emoticons' },
  { start: 0x1f650, end: 0x1f8ff, name: 'Transport and Map Symbols' },
  { start: 0x1f900, end: 0x1f9ff, name: 'Supplemental Symbols and Pictographs' },
];

/** Name of the Unicode block containing a codepoint, or null. */
export function blockFor(cp: number): string | null {
  const block = BLOCKS.find((b) => cp >= b.start && cp <= b.end);
  return block ? block.name : null;
}

/** Plane for a codepoint: Basic Multilingual Plane or Supplementary Plane N. */
export function planeFor(cp: number): string {
  const plane = cp >> 16;
  if (plane === 0) return 'Basic Multilingual Plane (BMP)';
  return `Supplementary Plane ${plane} (SPD-${plane})`;
}

/** Rough character category from codepoint ranges. */
export function categoryFor(cp: number): string {
  if (cp === 0x20) return 'Separator (space)';
  if ((cp >= 0x09 && cp <= 0x0d) || cp === 0x85) return 'Separator (control format)';
  if (cp >= 0x30 && cp <= 0x39) return 'Number (digit)';
  if (cp >= 0x41 && cp <= 0x5a) return 'Letter (uppercase)';
  if (cp >= 0x61 && cp <= 0x7a) return 'Letter (lowercase)';
  if (cp >= 0x100 && cp <= 0x1eff) return 'Letter';
  if (cp >= 0x370 && cp <= 0x3ff) return 'Letter';
  if (cp >= 0x400 && cp <= 0x4ff) return 'Letter';
  if (cp >= 0x590 && cp <= 0x6ff) return 'Letter';
  if (cp >= 0x900 && cp <= 0x97f) return 'Letter';
  if (cp >= 0x3000 && cp <= 0x9fff) return 'Letter or symbol (CJK)';
  if (cp >= 0xac00 && cp <= 0xd7af) return 'Letter (Hangul syllable)';
  if (cp >= 0x1f300 && cp <= 0x1faff) return 'Symbol (emoji / pictograph)';
  if (cp >= 0x2000 && cp <= 0x206f) return 'Punctuation';
  if (cp >= 0x2190 && cp <= 0x22ff) return 'Symbol (math / arrow)';
  if (cp >= 0x2300 && cp <= 0x27bf) return 'Symbol';
  if ((cp >= 0x0 && cp <= 0x1f) || cp === 0x7f) return 'Control character';
  if (cp >= 0xff00 && cp <= 0xffef) return 'Letter or symbol (fullwidth)';
  return 'Symbol / other';
}

/** Official Unicode name for well-known characters, otherwise the codepoint label. */
export function unicodeName(cp: number): string {
  const named: Record<number, string> = {
    0x00: 'NULL (control)',
    0x09: 'CHARACTER TABULATION',
    0x0a: 'LINE FEED (LF)',
    0x0d: 'CARRIAGE RETURN (CR)',
    0x20: 'SPACE',
    0x21: 'EXCLAMATION MARK',
    0x22: 'QUOTATION MARK',
    0x23: 'NUMBER SIGN',
    0x24: 'DOLLAR SIGN',
    0x25: 'PERCENT SIGN',
    0x26: 'AMPERSAND',
    0x27: 'APOSTROPHE',
    0x28: 'LEFT PARENTHESIS',
    0x29: 'RIGHT PARENTHESIS',
    0x2a: 'ASTERISK',
    0x2b: 'PLUS SIGN',
    0x2c: 'COMMA',
    0x2d: 'HYPHEN-MINUS',
    0x2e: 'FULL STOP',
    0x2f: 'SOLIDUS',
    0x30: 'DIGIT ZERO',
    0x31: 'DIGIT ONE',
    0x32: 'DIGIT TWO',
    0x33: 'DIGIT THREE',
    0x34: 'DIGIT FOUR',
    0x35: 'DIGIT FIVE',
    0x36: 'DIGIT SIX',
    0x37: 'DIGIT SEVEN',
    0x38: 'DIGIT EIGHT',
    0x39: 'DIGIT NINE',
    0x3a: 'COLON',
    0x3b: 'SEMICOLON',
    0x3c: 'LESS-THAN SIGN',
    0x3d: 'EQUALS SIGN',
    0x3e: 'GREATER-THAN SIGN',
    0x3f: 'QUESTION MARK',
    0x40: 'COMMERCIAL AT',
    0x41: 'LATIN CAPITAL LETTER A',
    0x42: 'LATIN CAPITAL LETTER B',
    0x43: 'LATIN CAPITAL LETTER C',
    0x44: 'LATIN CAPITAL LETTER D',
    0x45: 'LATIN CAPITAL LETTER E',
    0x46: 'LATIN CAPITAL LETTER F',
    0x47: 'LATIN CAPITAL LETTER G',
    0x48: 'LATIN CAPITAL LETTER H',
    0x49: 'LATIN CAPITAL LETTER I',
    0x4a: 'LATIN CAPITAL LETTER J',
    0x4b: 'LATIN CAPITAL LETTER K',
    0x4c: 'LATIN CAPITAL LETTER L',
    0x4d: 'LATIN CAPITAL LETTER M',
    0x4e: 'LATIN CAPITAL LETTER N',
    0x4f: 'LATIN CAPITAL LETTER O',
    0x50: 'LATIN CAPITAL LETTER P',
    0x51: 'LATIN CAPITAL LETTER Q',
    0x52: 'LATIN CAPITAL LETTER R',
    0x53: 'LATIN CAPITAL LETTER S',
    0x54: 'LATIN CAPITAL LETTER T',
    0x55: 'LATIN CAPITAL LETTER U',
    0x56: 'LATIN CAPITAL LETTER V',
    0x57: 'LATIN CAPITAL LETTER W',
    0x58: 'LATIN CAPITAL LETTER X',
    0x59: 'LATIN CAPITAL LETTER Y',
    0x5a: 'LATIN CAPITAL LETTER Z',
    0x5b: 'LEFT SQUARE BRACKET',
    0x5c: 'REVERSE SOLIDUS',
    0x5d: 'RIGHT SQUARE BRACKET',
    0x5e: 'CIRCUMFLEX ACCENT',
    0x5f: 'LOW LINE',
    0x60: 'GRAVE ACCENT',
    0x61: 'LATIN SMALL LETTER A',
    0x62: 'LATIN SMALL LETTER B',
    0x63: 'LATIN SMALL LETTER C',
    0x64: 'LATIN SMALL LETTER D',
    0x65: 'LATIN SMALL LETTER E',
    0x66: 'LATIN SMALL LETTER F',
    0x67: 'LATIN SMALL LETTER G',
    0x68: 'LATIN SMALL LETTER H',
    0x69: 'LATIN SMALL LETTER I',
    0x6a: 'LATIN SMALL LETTER J',
    0x6b: 'LATIN SMALL LETTER K',
    0x6c: 'LATIN SMALL LETTER L',
    0x6d: 'LATIN SMALL LETTER M',
    0x6e: 'LATIN SMALL LETTER N',
    0x6f: 'LATIN SMALL LETTER O',
    0x70: 'LATIN SMALL LETTER P',
    0x71: 'LATIN SMALL LETTER Q',
    0x72: 'LATIN SMALL LETTER R',
    0x73: 'LATIN SMALL LETTER S',
    0x74: 'LATIN SMALL LETTER T',
    0x75: 'LATIN SMALL LETTER U',
    0x76: 'LATIN SMALL LETTER V',
    0x77: 'LATIN SMALL LETTER W',
    0x78: 'LATIN SMALL LETTER X',
    0x79: 'LATIN SMALL LETTER Y',
    0x7a: 'LATIN SMALL LETTER Z',
    0x7b: 'LEFT CURLY BRACKET',
    0x7c: 'VERTICAL LINE',
    0x7d: 'RIGHT CURLY BRACKET',
    0x7e: 'TILDE',
    0xa0: 'NO-BREAK SPACE',
    0xa9: 'COPYRIGHT SIGN',
    0xae: 'REGISTERED SIGN',
    0xb0: 'DEGREE SIGN',
    0xb1: 'PLUS-MINUS SIGN',
    0xd7: 'MULTIPLICATION SIGN',
    0xf7: 'DIVISION SIGN',
    0xdf: 'LATIN SMALL LETTER SHARP S',
    0xe4: 'LATIN SMALL LETTER A WITH DIAERESIS',
    0xf6: 'LATIN SMALL LETTER O WITH DIAERESIS',
    0xfc: 'LATIN SMALL LETTER U WITH DIAERESIS',
    0x2018: 'LEFT SINGLE QUOTATION MARK',
    0x2019: 'RIGHT SINGLE QUOTATION MARK',
    0x201c: 'LEFT DOUBLE QUOTATION MARK',
    0x201d: 'RIGHT DOUBLE QUOTATION MARK',
    0x2013: 'EN DASH',
    0x2014: 'EM DASH',
    0x2026: 'HORIZONTAL ELLIPSIS',
    0x20ac: 'EURO SIGN',
    0x2190: 'LEFTWARDS ARROW',
    0x2192: 'RIGHTWARDS ARROW',
    0x2212: 'MINUS SIGN',
    0x2260: 'NOT EQUAL TO',
    0x2264: 'LESS-THAN OR EQUAL TO',
    0x2265: 'GREATER-THAN OR EQUAL TO',
    0x221e: 'INFINITY',
    0x2211: 'N-ARY SUMMATION',
    0x221a: 'SQUARE ROOT',
    0x2248: 'ALMOST EQUAL TO',
    0x2022: 'BULLET',
    0x2603: 'SNOWMAN',
    0x2713: 'CHECK MARK',
    0x2717: 'BALLOT X',
    0x2764: 'HEAVY BLACK HEART',
    0x3000: 'IDEOGRAPHIC SPACE',
    0x1f600: 'GRINNING FACE',
    0x1f601: 'BEAMING FACE WITH SMILING EYES',
    0x1f602: 'FACE WITH TEARS OF JOY',
    0x1f609: 'WINKING FACE',
    0x1f642: 'SLIGHTLY SMILING FACE',
    0x1f44d: 'THUMBS UP SIGN',
    0x1f525: 'FIRE',
    0x1f680: 'ROCKET',
    0x1f31f: 'GLOWING STAR',
    0x1f916: 'ROBOT FACE',
  };
  const name = named[cp];
  if (name) return name;
  const block = blockFor(cp);
  return block
    ? `${block} character U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
    : `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

export interface StringCharInfo {
  char: string;
  cp: number;
  name: string;
}

/** Inspect a full string: one entry per codepoint, in order. */
export function inspectString(input: string): StringCharInfo[] {
  return Array.from(input).map((char) => {
    const cp = char.codePointAt(0) as number;
    return { char, cp, name: unicodeName(cp) };
  });
}

/** Characters in the same block around a codepoint, excluding itself. */
export function neighbours(cp: number, radius = 6): StringCharInfo[] {
  const start = Math.max(0, cp - radius);
  const result: StringCharInfo[] = [];
  for (let i = start; i < start + radius * 2 + 1; i += 1) {
    if (i === cp || i > 0x10ffff) continue;
    result.push({ char: String.fromCodePoint(i), cp: i, name: unicodeName(i) });
  }
  return result;
}

/** Human-readable summary of the current lookup, or null when invalid. */
export function resultText(state: ToolState): string | null {
  const parsed = parseLookup(state.query);
  if (!parsed) return null;
  const enc = encodingsFor(parsed.cp);
  return `${enc.hexCodepoint} — ${unicodeName(parsed.cp)}`;
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const result = resultText(state);
  return result === null ? 'Enter a character or codepoint to inspect' : result;
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.query === 'string';
}
