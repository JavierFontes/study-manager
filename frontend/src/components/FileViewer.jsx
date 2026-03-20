import { useState, useEffect } from 'react'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { getNotas, crearNota, eliminarNota } from '../api/client'

const EXTENSIONES_CODIGO = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'sql']

export default function FileViewer({ archivo, onCerrar, onEnviarAlChat }) {
  const [contenidoTexto, setContenidoTexto] = useState(null)
  const [notas, setNotas] = useState([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mostrarNotas, setMostrarNotas] = useState(true)

  const url = `http://localhost:8000/archivos/ver/${archivo.id}`
  const ext = archivo.extension?.toLowerCase()

  const esPDF = ext === 'pdf'
  const esImagen = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
  const esMarkdown = ext === 'md'
  const esCodigo = EXTENSIONES_CODIGO.includes(ext)
  const esTexto = ext === 'txt' || esMarkdown || esCodigo

  useEffect(() => {
    cargarNotas()
    if (esTexto) cargarTexto()
  }, [archivo.id])

  const cargarNotas = async () => {
    try {
      const res = await getNotas(archivo.id)
      setNotas(res.data)
    } catch { setNotas([]) }
  }

  const cargarTexto = async () => {
    const res = await fetch(url)
    const texto = await res.text()
    setContenidoTexto(texto)
  }

  const handleGuardarNota = async () => {
    if (!nuevaNota.trim()) return
    setGuardando(true)
    await crearNota(archivo.id, nuevaNota.trim())
    setNuevaNota('')
    await cargarNotas()
    setGuardando(false)
  }

  const handleEliminarNota = async (notaId) => {
    await eliminarNota(notaId)
    setNotas(prev => prev.filter(n => n.id !== notaId))
  }

  const handleEnviarConNotas = () => {
    const notasTexto = notas.length > 0
      ? `\n\n--- Notas del estudiante sobre este archivo ---\n${notas.map(n => `• ${n.contenido}`).join('\n')}`
      : ''
    onEnviarAlChat({ ...archivo, notasExtra: notasTexto })
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.92)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {esPDF ? '📄' : esImagen ? '🖼️' : esMarkdown ? '📝' : esCodigo ? '💻' : '📄'}
          </span>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              {archivo.nombre}
            </p>
            <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{ext}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarNotas(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: mostrarNotas ? 'var(--accent-soft)' : 'var(--bg-input)',
              color: mostrarNotas ? 'var(--accent)' : 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            📝 Notas {notas.length > 0 && `(${notas.length})`}
          </button>

          {esPDF && (
            <button
              onClick={handleEnviarConNotas}
              className="px-3 py-1.5 rounded-lg text-white text-xs transition-all"
              style={{ background: 'var(--accent)' }}
            >
              Enviar al chat →
            </button>
          )}

          <button onClick={onCerrar}
            className="px-3 py-1.5 rounded-lg text-sm transition-all"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            ✕ Cerrar
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Contenido principal */}
        <div className="flex-1 overflow-auto flex justify-center"
          style={{ background: '#0a0b0f' }}>

          {esPDF && (
            <iframe src={url} className="w-full h-full border-0" title={archivo.nombre} />
          )}

          {esImagen && (
            <div className="flex items-center justify-center p-8">
              <img src={url} alt={archivo.nombre}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            </div>
          )}

          {esMarkdown && contenidoTexto !== null && (
            <div className="max-w-3xl w-full px-8 py-6">
              <div className="prose prose-invert prose-base max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {contenidoTexto}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {esCodigo && contenidoTexto !== null && (
            <div className="w-full max-w-5xl px-6 py-6">
              <SyntaxHighlighter
                language={ext === 'py' ? 'python' : ext === 'jsx' ? 'javascript' : ext}
                style={atomOneDark}
                showLineNumbers
                customStyle={{ borderRadius: '12px', fontSize: '13px', margin: 0 }}
              >
                {contenidoTexto}
              </SyntaxHighlighter>
            </div>
          )}

          {ext === 'txt' && contenidoTexto !== null && (
            <div className="max-w-3xl w-full px-8 py-6">
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
                style={{ color: 'var(--text-primary)' }}>
                {contenidoTexto}
              </pre>
            </div>
          )}

          {!esPDF && !esImagen && !esTexto && (
            <div className="flex flex-col items-center justify-center text-center mt-20">
              <p className="text-4xl mb-4">📎</p>
              <p style={{ color: 'var(--text-secondary)' }}>Formato no previsualizable</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{archivo.nombre}</p>
            </div>
          )}
        </div>

        {/* Panel de notas */}
        {mostrarNotas && (
          <div className="flex flex-col shrink-0"
            style={{ width: '280px', borderLeft: '1px solid var(--border)', background: 'var(--bg-primary)' }}>

            <div className="px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                📝 Notas al margen
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                La IA las usará como contexto
              </p>
            </div>

            {/* Lista de notas */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notas.length === 0 && (
                <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
                  Sin notas aún
                </p>
              )}
              {notas.map(n => (
                <div key={n.id} className="group rounded-xl p-3 relative"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs leading-relaxed pr-4" style={{ color: 'var(--text-primary)' }}>
                    {n.contenido}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date(n.fecha).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => handleEliminarNota(n.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all
                      text-xs"
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Input nueva nota */}
            <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <textarea
                value={nuevaNota}
                onChange={e => setNuevaNota(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGuardarNota() }}
                placeholder="Escribí una nota... (Ctrl+Enter para guardar)"
                rows={3}
                className="w-full rounded-xl px-3 py-2 text-xs resize-none outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                onClick={handleGuardarNota}
                disabled={guardando || !nuevaNota.trim()}
                className="w-full mt-2 py-2 rounded-xl text-white text-xs transition-all"
                style={{
                  background: guardando || !nuevaNota.trim() ? 'var(--accent-soft)' : 'var(--accent)',
                  border: 'none', cursor: guardando ? 'wait' : 'pointer'
                }}
              >
                {guardando ? 'Guardando...' : '+ Guardar nota'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}