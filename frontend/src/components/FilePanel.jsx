import { useState, useEffect, useRef } from 'react'
import { getArchivos, subirArchivo, eliminarArchivo, leerPDF, generarFlashcards } from '../api/client'
import FlashcardViewer from './FlashcardViewer'
import FileViewer from './FileViewer'

export default function FilePanel({ materia, tipo, onEnviarPDF }) {
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef()
  const [flashcardsData, setFlashcardsData] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [viendoArchivo, setViendoArchivo] = useState(null)

  useEffect(() => {
    if (materia) cargar()
  }, [materia, tipo])

  const cargar = async () => {
    const res = await getArchivos(materia.id, tipo)
    setArchivos(res.data)
  }

  const handleSubir = async (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return
    setCargando(true)
    await subirArchivo(materia.id, tipo, archivo)
    await cargar()
    setCargando(false)
  }

  const handleEliminar = async (id) => {
    await eliminarArchivo(id)
    setArchivos(prev => prev.filter(a => a.id !== id))
  }

  const handleEnviarAlChat = async (archivo) => {
    if (archivo.extension !== 'pdf') return
    const res = await leerPDF(archivo.id)
    const notasExtra = archivo.notasExtra || ''
    onEnviarPDF(res.data.texto + notasExtra, archivo.nombre, res.data.truncado)
  }

  const handleFlashcards = async (archivo) => {
    setGenerando(true)
    try {
      const res = await generarFlashcards(archivo.id)
      setFlashcardsData({
        cards: res.data.flashcards,
        nombre: archivo.nombre
      })
      await cargar()  // recargar para mostrar el PDF generado
    } catch {
      alert('Error generando flashcards. Revisá que el archivo tenga texto.')
    }
    setGenerando(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest">
          {tipo === 'teorico' ? 'Teórico' : 'Práctico'}
        </h3>
        <button
          onClick={() => inputRef.current.click()}
          className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-white/70
            hover:bg-white/20 transition-all"
        >
          {cargando ? '...' : '+ Subir'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleSubir}
          accept=".pdf,.png,.jpg,.jpeg" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {archivos.length === 0 && (
          <p className="text-white/20 text-xs text-center mt-6">Sin archivos aún</p>
        )}
      {archivos.map(a => (
        <div key={a.id}
          onClick={() => setViendoArchivo(a)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5
            hover:bg-white/10 group transition-all cursor-pointer">
          <span className="text-sm">{a.extension === 'pdf' ? '📄' : '🖼️'}</span>
          <span
              className="flex-1 text-white/70 text-xs truncate"
              title={a.nombre}  // tooltip nativo del navegador
              style={{ color: 'var(--text-secondary)' }}
            >
              {a.nombre}
          </span>
          <div className="hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
            {a.extension === 'pdf' && (
              <button onClick={() => handleEnviarAlChat(a)}
                className="text-xs text-indigo-400 hover:text-indigo-300 px-1.5">
                chat
              </button>
            )}
            {a.extension === 'pdf' && tipo === 'teorico' && (
              <button onClick={() => handleFlashcards(a)}
                disabled={generando}
                className="text-xs text-amber-400 hover:text-amber-300 px-1.5">
                {generando ? '...' : '🃏'}
              </button>
            )}
            <button onClick={() => handleEliminar(a.id)}
              className="text-xs text-red-400 hover:text-red-300 px-1.5">
              ✕
            </button>
          </div>
        </div>
      ))}
      </div>
      {viendoArchivo && (
        <FileViewer
          archivo={viendoArchivo}
          onCerrar={() => setViendoArchivo(null)}
          onEnviarAlChat={(a) => {
            handleEnviarAlChat(a)
            setViendoArchivo(null)
          }}
        />
      )}
      {flashcardsData && (
        <FlashcardViewer
          flashcards={flashcardsData.cards}
          nombreArchivo={flashcardsData.nombre}
          onCerrar={() => setFlashcardsData(null)}
        />
      )}
    </div>
  )
}