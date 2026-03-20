import { useState } from 'react'
import axios from 'axios'

export default function SearchBar({ materiaId, onResultado }) {
  const [query, setQuery] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [resultados, setResultados] = useState([])

  const buscar = async () => {
    if (!query.trim()) return
    setBuscando(true)
    setAbierto(true)
    try {
      const params = { q: query }
      if (materiaId) params.materia_id = materiaId
      const res = await axios.get('http://localhost:8000/buscar', { params })
      setResultados(res.data)
    } catch {
      setResultados([])
    }
    setBuscando(false)
  }

  return (
    <div className="relative w-full">
      {/* Input de búsqueda */}
      <div className="flex gap-2 px-4 py-2 border-b border-white/10">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder="🔍 Buscar en el contenido de tus archivos..."
          className="flex-1 bg-white/8 border border-white/15 rounded-xl px-4 py-2
            text-white text-sm outline-none focus:border-indigo-500 transition-all
            placeholder:text-white/25"
        />
        <button
          onClick={buscar}
          disabled={buscando}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500
            text-white text-sm transition-all disabled:opacity-50"
        >
          {buscando ? '...' : 'Buscar'}
        </button>
        {abierto && (
          <button
            onClick={() => { setAbierto(false); setResultados([]); setQuery('') }}
            className="px-3 py-2 rounded-xl bg-white/8 text-white/50
              hover:text-white text-sm transition-all"
          >
            ✕
          </button>
        )}
      </div>

      {/* Resultados */}
      {abierto && (
        <div className="absolute top-full left-0 right-0 z-50 bg-[#1a1d27]
          border border-white/15 rounded-b-xl shadow-2xl max-h-96 overflow-y-auto">
          {resultados.length === 0 && !buscando && (
            <p className="text-white/30 text-sm text-center py-6">
              Sin resultados para "{query}"
            </p>
          )}
          {resultados.map((r, i) => (
            <div
              key={i}
              onClick={() => { onResultado(r); setAbierto(false) }}
              className="px-4 py-3 border-b border-white/8 hover:bg-white/8
                cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-xs font-semibold">📄 {r.nombre}</span>
                <span className="text-indigo-400 text-xs">
                  {Math.round(r.score * 100)}% relevante
                </span>
              </div>
              <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
                {r.chunk}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}