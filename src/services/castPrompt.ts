export type CastValue = unknown;

export function normalizeCastNames(cast: CastValue): string[] {
  if (typeof cast === 'string') {
    return cast
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(cast)) {
    return cast
      .flatMap(v => (typeof v === 'string' ? v.split(',') : []))
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function buildCastPromptBlock(castNames: string[]): string {
  const names = castNames.map(s => s.trim()).filter(Boolean);
  const hasThaiName = names.some(n => /[\u0E00-\u0E7F]/.test(n));

  if (names.length === 0) {
    return (
      'CAST RULES (AUTHORITATIVE):\n' +
      '- No humans/people visible in frame unless explicitly specified.\n'
    );
  }

  const list = names.join(', ');

  if (names.length === 1) {
    return (
      'CAST RULES (AUTHORITATIVE):\n' +
      `- Exactly 1 person in frame: ${list}.\n` +
      (hasThaiName
        ? '- Appearance: Thai/Asian features; avoid Western/Caucasian look unless explicitly required.\n'
        : '') +
      '- Keep this character visible; do not cut them out of frame.\n' +
      '- No extra people, no crowd, no background people.\n'
    );
  }

  return (
    'CAST RULES (AUTHORITATIVE):\n' +
    `- Exactly ${names.length} people in frame: ${list}.\n` +
    (hasThaiName
      ? '- Appearance: Thai/Asian features; avoid Western/Caucasian look unless explicitly required.\n'
      : '') +
    '- Keep ALL listed characters visible; do not drop/omit anyone.\n' +
    '- No extra people, no crowd, no background people.\n'
  );
}
