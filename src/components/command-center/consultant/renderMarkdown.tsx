// Lightweight markdown→JSX for AI chat messages (bold, bullets, newlines, code).
// Lifted verbatim from ai-chat-panel.tsx so ChatSection matches its rendering exactly.
export function renderMarkdown(text: string) {
  const cleaned = text.replace(/```(?:json)?\s*\n?/gi, '').replace(/\n?```\s*/gi, '');
  const lines = cleaned.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*[{}[\]"]\s*$/.test(line) || /^\s*"(message|actions|action|cardName|replaceWith|quantity|reason)"/.test(line)) {
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex gap-1 ml-1">
          <span className="shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(<div key={i}>{renderInline(line)}</div>);
    }
  }
  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const boldIdx = boldMatch?.index ?? Infinity;
    const codeIdx = codeMatch?.index ?? Infinity;

    if (boldIdx === Infinity && codeIdx === Infinity) {
      parts.push(remaining);
      break;
    }
    if (boldIdx <= codeIdx && boldMatch) {
      parts.push(remaining.slice(0, boldIdx));
      parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    } else if (codeMatch) {
      parts.push(remaining.slice(0, codeIdx));
      parts.push(<code key={key++} className="rounded bg-black/20 px-1 py-0.5 text-sm">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeIdx + codeMatch[0].length);
    }
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
