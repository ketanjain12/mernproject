import React, { useMemo } from 'react';

export default function TruncateWords({ text, chars, words, className }) {
  const { display, full } = useMemo(() => {
    const fullText = String(text || '');
    const trimmed = fullText.trim();

    if (typeof chars === 'number') {
      if (trimmed.length <= chars) return { display: fullText, full: fullText };
      return { display: `${trimmed.slice(0, chars)}....`, full: fullText };
    }

    const w = typeof words === 'number' ? words : 4;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length <= w) return { display: fullText, full: fullText };
    return { display: `${parts.slice(0, w).join(' ')}...`, full: fullText };
  }, [text, chars, words]);

  return (
    <span title={full} className={className}>
      {display}
    </span>
  );
}
