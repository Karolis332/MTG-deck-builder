'use client';

interface CardLineProps {
  name: string;
  remaining: number;
  total: number;
  probability: number | null;
  isDrawn?: boolean;
  manaCost?: string | null;
}

/** Color map for mana symbols */
function manaColor(symbol: string): string {
  switch (symbol) {
    case 'W': return '#f9faf4';
    case 'U': return '#0e68ab';
    case 'B': return '#a69f9d';
    case 'R': return '#d3202a';
    case 'G': return '#00733e';
    default: return '#8b7355';
  }
}

function renderManaCost(manaCost: string): React.ReactNode {
  const symbols = manaCost.match(/\{([^}]+)\}/g) ?? [];
  return (
    <span style={{ display: 'flex', gap: 1, marginLeft: 4 }}>
      {symbols.map((s, i) => {
        const inner = s.replace(/[{}]/g, '');
        return (
          <span
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: /^\d+$/.test(inner)
                ? 'rgba(139, 115, 85, 0.5)'
                : manaColor(inner),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontWeight: 700,
              color: inner === 'W' || inner === 'B' ? '#1a1a2e' : '#fff',
              lineHeight: 1,
            }}
          >
            {/^\d+$/.test(inner) ? inner : ''}
          </span>
        );
      })}
    </span>
  );
}

export function CardLine({ name, remaining, total, probability, isDrawn, manaCost }: CardLineProps) {
  const pctWidth = probability != null ? Math.min(probability * 100, 100) : 0;

  return (
    <div style={{
      ...styles.row,
      opacity: isDrawn || remaining === 0 ? 0.35 : 1,
      textDecoration: remaining === 0 ? 'line-through' : 'none',
    }}>
      {/* Probability bar background */}
      <div style={{
        ...styles.probBar,
        width: `${pctWidth}%`,
      }} />

      <span style={styles.qty}>{remaining}/{total}</span>
      <span style={styles.name}>{name}</span>
      {manaCost && renderManaCost(manaCost)}
      {probability != null && probability > 0 && (
        <span style={styles.prob}>{(probability * 100).toFixed(1)}%</span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '2px 6px',
    position: 'relative',
    fontSize: 11,
    lineHeight: '18px',
    borderBottom: '1px solid rgba(201, 168, 76, 0.06)',
  },
  probBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(201, 168, 76, 0.08)',
    transition: 'width 0.3s ease',
    pointerEvents: 'none',
  },
  qty: {
    minWidth: 28,
    color: '#8b7355',
    fontSize: 10,
    textAlign: 'right' as const,
    marginRight: 6,
    fontFamily: 'monospace',
  },
  name: {
    flex: 1,
    color: '#d4c4a8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  prob: {
    minWidth: 36,
    textAlign: 'right' as const,
    color: '#c9a84c',
    fontSize: 10,
    fontFamily: 'monospace',
    marginLeft: 4,
  },
};
