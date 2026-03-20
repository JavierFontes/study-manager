import { useState, useRef } from 'react'
import { generarExamen } from '../api/client'
import ExamenSimulado from '../components/ExamenSimulado'
import FilePanel from '../components/FilePanel'
import ChatPanel from '../components/ChatPanel'
import SearchBar from '../components/SearchBar'

export default function MateriaDashboard({ materia }) {
  const [agente, setAgente] = useState('teorico')
  const chatRef = useRef()
  const [examenData, setExamenData] = useState(null)
  const [generandoExamen, setGenerandoExamen] = useState(false)
  const [configExamen, setConfigExamen] = useState({ n: 4, dificultad: 'intermedio' })
  const [panelWidth, setPanelWidth] = useState(200)
  const isResizing = useRef(false)

  const handleResizeStart = (e) => {
    isResizing.current = true
    document.body.style.userSelect = 'none'    // deshabilita selección de texto
    document.body.style.cursor = 'col-resize'  // cursor consistente mientras arrastrás
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }

const handleResizeEnd = () => {
  isResizing.current = false
  document.body.style.userSelect = ''   // restaura selección de texto
  document.body.style.cursor = ''       // restaura cursor
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

  const handleResizeMove = (e) => {
    if (!isResizing.current) return
    const newWidth = Math.min(400, Math.max(150, e.clientX)) 
    setPanelWidth(newWidth)
  }

  const handlePDF = (texto, nombre, truncado) => {
    if (chatRef.current?.enviarPDF) {
      chatRef.current.enviarPDF(texto, nombre, truncado)
    }
  }

  const handleGenerarExamen = async () => {
    setGenerandoExamen(true)
    try {
      const res = await generarExamen(materia.id, configExamen.n, configExamen.dificultad)
      setExamenData(res.data.examen)
    } catch {
      alert('Error generando el examen. Necesitás al menos un PDF en la materia.')
    }
    setGenerandoExamen(false)
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>

      {/* Panel de archivos redimensionable */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        <div style={{ width: panelWidth + 'px', flexShrink: 0, borderRight: '1px solid var(--border)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', background: 'var(--bg-primary)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: materia.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{materia.nombre}</span>
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
          </div>
          <FilePanel materia={materia} tipo="teorico" onEnviarPDF={handlePDF} />
          <div style={{ height: '1px', background: 'var(--border)' }} />
          <FilePanel materia={materia} tipo="practico" onEnviarPDF={handlePDF} />
        </div>

        {/* Borde arrastrable */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            width: '4px', cursor: 'col-resize', flexShrink: 0,
            background: 'transparent', transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      </div>

      {/* Panel derecho: tabs + chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>


        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '8px 16px 0', paddingRight: '160px', gap: '4px', flexShrink: 0, alignItems: 'flex-end' }}>
            {['teorico', 'practico'].map(a => (
            <button key={a} onClick={() => setAgente(a)}
              style={{
                padding: '8px 16px', fontSize: '14px',
                borderRadius: '8px 8px 0 0',
                border: agente === a ? '1px solid var(--border)' : 'none',
                borderBottom: agente === a ? '1px solid var(--bg-secondary)' : 'none',
                background: agente === a ? 'var(--bg-card)' : 'transparent',
                color: agente === a ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.15s'
              }}>
              {a === 'teorico' ? 'Agente Teórico' : 'Agente Práctico'}
            </button>
          ))}

          {/* Botón examen simulado */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
            <select
              value={configExamen.dificultad}
              // CORRECCIÓN: Ahora actualiza 'dificultad' y no 'n'
              onChange={e => setConfigExamen(p => ({ ...p, dificultad: e.target.value }))}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 8px' }}
            >
              <option value="basico">Básico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>

            <select
              value={configExamen.n}
              // CORRECCIÓN: Se arregló el paréntesis de cierre }))
              onChange={e => setConfigExamen(p => ({ ...p, n: Number(e.target.value) }))}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px', padding: '4px 8px' }}
            >
              <option value={3}>3 ej.</option>
              <option value={4}>4 ej.</option>
              <option value={5}>5 ej.</option>
            </select>

            <button
              onClick={handleGenerarExamen}
              disabled={generandoExamen}
              style={{ background: generandoExamen ? 'var(--accent-soft)' : 'var(--accent)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}
            >
              {generandoExamen ? 'Generando...' : '📝 Examen simulado'}
            </button>
          </div>
        </div>

        {/* Búsqueda — debajo de las tabs, no arriba */}
        <SearchBar
          materiaId={materia.id}
          onResultado={(r) => {
            if (chatRef.current?.enviarPDF) {
              chatRef.current.enviarPDF(r.chunk, r.nombre, false)
            }
          }}
        />

        {/* Chat */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <ChatPanel
            ref={chatRef}
            materia={materia}
            agente={agente}
            key={`${materia.id}-${agente}`}
          />
        </div>
      </div>

      {examenData && (
        <ExamenSimulado
          examen={examenData}
          materia={materia.nombre}
          onCerrar={() => setExamenData(null)}
        />
      )}
    </div>
  )
}