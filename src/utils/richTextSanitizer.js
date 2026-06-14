const CLIPBOARD_FRAGMENT_PATTERNS = [
  /<!--\s*(?:Start|End)Fragment\s*-->/gi,
  /&lt;!--\s*(?:Start|End)Fragment\s*--&gt;/gi,
  /&amp;lt;!--\s*(?:Start|End)Fragment\s*--&amp;gt;/gi,
];

export const stripClipboardFragments = (value = '') => {
  let output = String(value || '');
  for (let index = 0; index < 3; index += 1) {
    const next = CLIPBOARD_FRAGMENT_PATTERNS.reduce((current, pattern) => current.replace(pattern, ''), output);
    if (next === output) break;
    output = next;
  }
  return output;
};
