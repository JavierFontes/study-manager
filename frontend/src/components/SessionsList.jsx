import { useEffect, useState } from 'react'
import { getSesiones, eliminarSesion } from '../api/client'

export default function SessionsList({ materia, agente, sesionActiva, onSelect, onNueva, onEliminar }) {
  const [sesiones, setSesiones] = useState([])

  useEffect(() => {
    if (materia && agente) cargar()
  }, [materia?.id, agente])

  const cargar = async () => {
    try {
      const res = await getSesiones(materia.id, agente)
      setSesiones(res.data)
    } catch { setSesiones([]) }
  }

  SessionsList.recargar = cargar

  const handleEliminar = async (e, sesionId) => {
    e.stopPropagation()  // evita que dispare onSelect
    await eliminarSesion(sesionId)
    setSesiones(prev => prev.filter(s => s.id !== sesionId))
    if (sesionActiva === sesionId && onEliminar) onEliminar()
  }

  if (sesiones.length === 0) return null

  return (
    <div className="border-b border-white/10 px-4 py-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">
          Conversaciones
        </span>
        <button
          onClick={onNueva}
          className="ml-auto text-xs px-2 py-0.5 rounded-md bg-white/8
            text-white/50 hover:text-white hover:bg-white/15 transition-all"
        >
          + Nueva
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sesiones.map(s => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className={`shrink-0 max-w-[160px] relative group px-3 py-1.5 rounded-lg
              text-xs transition-all border cursor-pointer
              ${sesionActiva === s.id
                ? 'bg-white/15 border-white/25 text-white'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'}`}
          >
            <div className="text-white/30 text-[10px] mb-0.5 pr-4">{s.fecha}</div>
            <div className="truncate pr-4">{s.preview}</div>

            {/* Botón borrar — aparece al hacer hover */}
            <button
              onClick={(e) => handleEliminar(e, s.id)}
              className="absolute top-1 right-1 w-4 h-4 rounded-full
                bg-red-500/0 hover:bg-red-500 text-white/0 hover:text-white
                group-hover:text-white/50 transition-all flex items-center justify-center
                text-[10px] leading-none"
              title="Eliminar conversación"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}