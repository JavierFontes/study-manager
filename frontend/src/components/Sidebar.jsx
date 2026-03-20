import { eliminarMateria } from '../api/client'
import { TEMAS } from '../themes'

export default function Sidebar({ materias, activa, onSelect, onNueva, onEliminar, temaActual, onCambiarTema }) {

  const handleEliminar = async (e, materia) => {
    e.stopPropagation()
    const confirmar = window.confirm(`¿Eliminár "${materia.nombre}"? Se borrarán todos sus archivos y conversaciones.`)
    if (!confirmar) return
    await eliminarMateria(materia.id)
    onEliminar(materia)
  }

  return (
    <aside style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', background: 'var(--bg-primary)', flexShrink: 0 }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', margin: 0 }}>StudyOS</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>tu espacio de estudio</p>
      </div>

      {/* Materias */}
      <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
        {materias.map(m => (
          <div
            key={m.id}
            onClick={() => onSelect(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
              marginBottom: '2px', transition: 'all 0.15s',
              background: activa?.id === m.id ? 'var(--bg-card)' : 'transparent',
              color: activa?.id === m.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              position: 'relative'
            }}
            className="group"
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            <span
              style={{ flex: 1, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={m.nombre}
            >
              {m.nombre}
            </span>
            <button
              onClick={(e) => handleEliminar(e, m)}
              style={{ opacity: 0, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '0 2px', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
              ✕
            </button>
          </div>
        ))}
      </nav>

      {/* Selector de temas */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px', paddingLeft: '4px' }}>Tema</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {Object.entries(TEMAS).map(([key, tema]) => (
            <button
              key={key}
              onClick={() => onCambiarTema(key)}
              title={tema.nombre}
              style={{
                padding: '6px', borderRadius: '8px',
                border: temaActual === key ? '2px solid var(--border-focus)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <span style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: tema.color,
                border: '1px solid rgba(128,128,128,0.3)',
                display: 'block'
              }} />
            </button>
          ))}
        </div>
      </div>

      {/* Nueva materia */}
      {materias.length < 6 && (
        <div style={{ padding: '0 12px 16px' }}>
          <button
            onClick={onNueva}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px',
              border: '1px dashed var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            + Nueva materia
          </button>
        </div>
      )}
    </aside>
  )
}