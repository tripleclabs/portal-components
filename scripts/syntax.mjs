import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';

// Explicit grammars only. This returns escaped, highlighted HTML; it never
// executes source or relies on runtime language detection.
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
export function highlight(source, language) {
  if (!['xml', 'css', 'json'].includes(language)) throw new Error(`Unsupported code language: ${language}`);
  return hljs.highlight(source, { language, ignoreIllegals: true }).value;
}
