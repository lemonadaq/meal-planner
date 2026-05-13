export default function NavBar({ aktywny, onChange }) {
  const tabs = [
    { id: 'home', ikona: '🏠', label: 'Home' },
    { id: 'planer', ikona: '📅', label: 'Planer' },
    { id: 'przepisy', ikona: '🍽️', label: 'Przepisy' },
    { id: 'zakupy', ikona: '🛒', label: 'Zakupy' },
  ]

  return (
    <nav style={s.nav}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          style={{ ...s.tab, ...(aktywny === tab.id ? s.tabActive : {}) }}
          onClick={() => onChange(tab.id)}
        >
          <span style={s.ikona}>{tab.ikona}</span>
          <span style={{ ...s.label, ...(aktywny === tab.id ? s.labelActive : {}) }}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  )
}

const s = {
  nav: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    background: 'white',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    padding: '8px 0 20px',
    zIndex: 100,
    boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
  },
  tabActive: {},
  ikona: { fontSize: 22 },
  label: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: 500,
  },
  labelActive: {
    color: '#4a86e8',
    fontWeight: 700,
  },
}