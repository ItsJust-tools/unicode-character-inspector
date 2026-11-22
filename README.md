# Unicode Character Inspector

Look up any Unicode character or codepoint and get its name, category, block, and encoding representations instantly.

**Live:** [unicode-character-inspector.itsjust.tools](https://unicode-character-inspector.itsjust.tools)

## Features

- Search box accepting pasted characters, `U+1F600` codepoints, hex (`1F600`, `0x1F600`) or decimal (`128512`) values
- Instant codepoint table: hex, decimal, UTF-8, UTF-16 (with surrogate pairs), HTML entity, CSS and JS escapes, URL encoding
- Character details: official Unicode name, category, block, and plane
- String inspector: paste a full string and inspect every codepoint in order
- One-click copy buttons for every representation
- Nearby-character browser around the current codepoint
- Fully client-side with URL state so lookups are shareable
- Dark mode and responsive layout

## Development

```bash
npm ci
npm run dev
```

```bash
npm test
npm run build
```

## License

MIT
