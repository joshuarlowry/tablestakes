/**
 * Pure markdown export. No DOM — takes a derived view (or board) and returns
 * a string, so it's testable headlessly and reusable for both copy-to-
 * clipboard and file download.
 */
export function boardToMarkdown(view, { title } = {}) {
  const lines = [];
  if (title) lines.push(`# ${title}`, '');
  for (const col of view.board.columns) {
    lines.push(`## ${col.title}`);
    if (!col.cards.length) {
      lines.push('_(empty)_');
    } else {
      for (const card of col.cards) {
        const author = view.names[card.author] || 'unknown';
        lines.push(`- ${card.text} — _${author}_`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

export function timelineToMarkdown(view, { title } = {}) {
  const lines = [];
  if (title) lines.push(`# ${title}`, '');
  for (const col of view.board.columns) {
    if (col.key === 'timeline') continue;
    lines.push(`## ${col.title}`);
    if (!col.cards.length) lines.push('_(empty)_');
    else for (const card of col.cards) lines.push(`- ${card.text}`);
    lines.push('');
  }
  const timeline = view.board.columns.find(c => c.key === 'timeline');
  if (timeline) {
    lines.push('## Timeline');
    if (!timeline.cards.length) lines.push('_(empty)_');
    else for (const card of timeline.cards) {
      const stamp = card.time ? `**${card.time}** — ` : '';
      lines.push(`- ${stamp}${card.text}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}
