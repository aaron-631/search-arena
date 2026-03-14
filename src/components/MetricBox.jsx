export function MetricBox({ label, value, color }) {
  return (
    <div style={{ background: '#0a0a0f', border: `1px solid ${color}33`, borderRadius: 6, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#555', letterSpacing: 2, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}
