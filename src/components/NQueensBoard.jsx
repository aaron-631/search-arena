// 1. Add onSquareClick to the destructured props
export function NQueensBoard({ board, n, stepInfo, onSquareClick }) {
  const cellSize = Math.max(26, Math.min(52, Math.floor(380 / n)));
  const activeRow = stepInfo?.row;
  const isPlace   = stepInfo?.action === 'place';

  return (
    <div style={{ display: 'inline-block', border: '1px solid #2a2a3e', borderRadius: 4 }}>
      {Array.from({ length: n }).map((_, row) => (
        <div key={row} style={{ display: 'flex' }}>
          {Array.from({ length: n }).map((_, col) => {
            const hasQueen = board[row] === col;
            const isLight  = (row + col) % 2 === 0;
            let bg = isLight ? '#161625' : '#0f0f1a';
            if (hasQueen && row === activeRow) bg = isPlace ? 'rgba(0,255,136,0.25)' : 'rgba(255,68,68,0.25)';
            else if (hasQueen) bg = 'rgba(0,207,255,0.15)';
            
            return (
              <div key={col} 
                // 2. Add the onClick handler here
                onClick={() => onSquareClick && onSquareClick(row, col)}
                style={{
                width: cellSize, height: cellSize, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: cellSize * 0.55,
                border: hasQueen && row === activeRow ? `1px solid ${isPlace ? '#00ff88' : '#ff4444'}` : '1px solid transparent',
                transition: 'all 0.1s',
                // 3. Change the cursor so it looks clickable when manual play is active
                cursor: onSquareClick ? 'pointer' : 'default'
              }}>
                {hasQueen && (
                  <span style={{
                    color: row === activeRow ? (isPlace ? '#00ff88' : '#ff4444') : '#00cfff',
                    filter: row === activeRow ? `drop-shadow(0 0 6px ${isPlace ? '#00ff88' : '#ff4444'})` : 'none',
                    transition: 'color 0.15s',
                  }}>♛</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}