'use client';

interface OverlayHeaderProps {
  playerLife: number;
  opponentLife: number;
  turnNumber: number;
  format: string | null;
  playerName: string | null;
  opponentName: string | null;
}

export function OverlayHeader({
  playerLife,
  opponentLife,
  turnNumber,
  format,
  playerName,
  opponentName,
}: OverlayHeaderProps) {
  const formatLabel = format ? format.replace(/^[A-Z]+_/, '').replace(/_/g, ' ') : '';

  return (
    <div style={styles.header}>
      <div style={styles.topRow}>
        {formatLabel && <span style={styles.format}>{formatLabel}</span>}
        <span style={styles.turn}>T{turnNumber}</span>
      </div>
      <div style={styles.lifeRow}>
        <div style={styles.lifeBlock}>
          <span style={styles.lifeName}>{playerName ?? 'You'}</span>
          <span style={{
            ...styles.lifeValue,
            color: playerLife <= 5 ? '#e74c3c' : playerLife <= 10 ? '#f39c12' : '#c9a84c',
          }}>
            {playerLife}
          </span>
        </div>
        <span style={styles.vs}>vs</span>
        <div style={styles.lifeBlock}>
          <span style={styles.lifeName}>{opponentName ?? 'Opp'}</span>
          <span style={{
            ...styles.lifeValue,
            color: opponentLife <= 5 ? '#27ae60' : '#d4c4a8',
          }}>
            {opponentLife}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '6px 8px',
    borderBottom: '1px solid rgba(201, 168, 76, 0.2)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  format: {
    fontSize: 9,
    color: '#6b5a3e',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  turn: {
    fontSize: 10,
    color: '#8b7355',
    fontWeight: 600,
  },
  lifeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lifeBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 60,
  },
  lifeName: {
    fontSize: 9,
    color: '#6b5a3e',
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  lifeValue: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
  },
  vs: {
    fontSize: 9,
    color: '#5a4e3a',
    fontStyle: 'italic',
  },
};
