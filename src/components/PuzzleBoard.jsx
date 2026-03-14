import { GOAL_STATE } from '../utils/stateUtils.js';

export function PuzzleBoard({ state, onClick, solved }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gap: 6,
      padding: 12, background: '#0d0d1a', borderRadius: 8,
      border: solved ? '1px solid #00ff88' : '1px solid #1a1a2e',
      boxShadow: solved ? '0 0 20px rgba(0,255,136,0.18)' : 'none',
      transition: 'all 0.3s',
    }}>
      {state.map((tile, idx) => {
        const blank   = tile === 0;
        const correct = tile !== 0 && tile === GOAL_STATE[idx];
        return (
          <div key={idx} onClick={() => onClick && !blank && onClick(idx)} style={{
            width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: blank ? 0 : 26, fontWeight: 900, borderRadius: 6,
            cursor: onClick && !blank ? 'pointer' : 'default',
            background: blank ? '#0a0a0f' : correct ? 'rgba(0,255,136,0.12)' : '#13131f',
            border: blank ? '1px dashed #222' : correct ? '1px solid rgba(0,255,136,0.5)' : '1px solid #2a2a3e',
            color: correct ? '#00ff88' : '#e0e0e0',
            boxShadow: correct ? '0 0 10px rgba(0,255,136,0.15)' : 'none',
            transition: 'all 0.15s', userSelect: 'none',
          }}>
            {blank ? '' : tile}
          </div>
        );
      })}
    </div>
  );
}
