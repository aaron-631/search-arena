export function Panel({ title, children, style = {}, gc }) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: `1px solid ${gc ? gc + '44' : '#1a1a2e'}`,
      borderRadius: 8, padding: 16,
      boxShadow: gc ? `0 0 20px ${gc}12` : 'none',
      ...style,
    }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: gc || '#444', marginBottom: 12, fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
