export const toolConfig = {
  id: 'unicode-character-inspector',
  name: 'Unicode Character Inspector',
  version: '1.0.0',
  category: 'Text',
  description:
    'Look up any Unicode character or codepoint and get its name, category, block, and encoding representations instantly.',
  exportFormats: [] as never[],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    brand: 'Unicode Character Inspector',
  },
};
export default toolConfig;
