import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import MateriaDashboard from './pages/MateriaDashboard'
import { getMaterias, crearMateria } from './api/client'
import { cargarTema, aplicarTema } from './themes'

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']

export default function App() {
  const [materias, setMaterias] = useState([])
  const [activa, setActiva] = useState(null)
  const [creando, setCreando] = useState(false)
  const [nombreNueva, setNombreNueva] = useState('')
  const [temaActual, setTemaActual] = useState('midnight')
  const [sidebarWidth, setSidebarWidth] = useState(224)
  const isResizingSidebar = useRef(false)

  const handleSidebarResizeStart = () => {
    isResizingSidebar.current = true
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', handleSidebarResizeMove)
    document.addEventListener('mouseup', handleSidebarResizeEnd)
  }

  const handleSidebarResizeEnd = () => {
    isResizingSidebar.current = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', handleSidebarResizeMove)
    document.removeEventListener('mouseup', handleSidebarResizeEnd)
  }

  const handleSidebarResizeMove = (e) => {
    if (!isResizingSidebar.current) return
    const newWidth = Math.min(350, Math.max(150, e.clientX))
    setSidebarWidth(newWidth)
  }

  useEffect(() => { cargarMaterias() }, [])

  useEffect(() => {
    const t = cargarTema()
    setTemaActual(t)
  }, [])

  const cambiarTema = (key) => {
    aplicarTema(key)
    setTemaActual(key)
  }

  const cargarMaterias = async () => {
    try {
      const res = await getMaterias()
      setMaterias(res.data)
      if (res.data.length > 0 && !activa) setActiva(res.data[0])
    } catch {
      console.error('Backend no disponible')
    }
  }

  const handleNueva = async () => {
    if (!nombreNueva.trim()) return
    const color = COLORS[materias.length % COLORS.length]
    await crearMateria(nombreNueva.trim(), color)
    setNombreNueva('')
    setCreando(false)
    await cargarMaterias()
  }

  return (
    <div className="flex h-full font-sans overflow-hidden"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      <div style={{ display: 'flex', flexShrink: 0 }}>
        <div style={{ width: sidebarWidth + 'px' }}>
          <Sidebar
            materias={materias}
            activa={activa}
            onSelect={setActiva}
            onNueva={() => setCreando(true)}
            onEliminar={(m) => {
              setMaterias(prev => prev.filter(x => x.id !== m.id))
              if (activa?.id === m.id) setActiva(null)
            }}
            temaActual={temaActual}
            onCambiarTema={cambiarTema}
          />
        </div>
        {/* Borde arrastrable */}
        <div
          onMouseDown={handleSidebarResizeStart}
          style={{
            width: '4px', cursor: 'col-resize', flexShrink: 0,
            background: 'transparent', transition: 'background 0.15s',
            zIndex: 10
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        />
      </div>

      <main className="flex-1 overflow-hidden">
        {activa
          ? <MateriaDashboard materia={activa} />
          : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="text-5xl mb-4">📖</div>
              <h2 className="text-lg font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}>
                Bienvenido a StudyOS
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Creá tu primera materia para empezar
              </p>
              <button
                onClick={() => setCreando(true)}
                className="mt-6 px-5 py-2.5 rounded-xl text-white text-sm transition-all"
                style={{ background: 'var(--accent)' }}
              >
                + Nueva materia
              </button>
            </div>
          )
        }
      </main>

      {/* Modal nueva materia */}
      {creando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setCreando(false)}>
          <div className="rounded-2xl p-6 w-80 shadow-2xl border"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border)'
            }}
            onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Nueva materia
            </h3>
            <input
              autoFocus
              value={nombreNueva}
              onChange={e => setNombreNueva(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNueva()}
              placeholder="Ej: Álgebra Lineal"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setCreando(false)}
                className="flex-1 py-2 rounded-xl text-sm transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
              <button onClick={handleNueva}
                className="flex-1 py-2 rounded-xl text-white text-sm transition-all"
                style={{ background: 'var(--accent)' }}>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}