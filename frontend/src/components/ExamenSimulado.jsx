import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { corregirExamen } from '../api/client'

export default function ExamenSimulado({ examen, materia, onCerrar }) {
  const [tiempoTotal, setTiempoTotal] = useState(60)
  const [tiempoRestante, setTiempoRestante] = useState(null)
  const [corriendo, setCorriendo] = useState(false)
  const [configurando, setConfigurando] = useState(true)
  const [terminado, setTerminado] = useState(false)
  const [respuestas, setRespuestas] = useState({})
  const [correccion, setCorreccion] = useState(null)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [tiempoUsado, setTiempoUsado] = useState(0)
  const intervalRef = useRef()

  useEffect(() => {
    if (corriendo && tiempoRestante > 0) {
      intervalRef.current = setInterval(() => {
        setTiempoRestante(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current)
            setCorriendo(false)
            setTerminado(true)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [corriendo])

  const iniciar = () => {
    setTiempoRestante(tiempoTotal * 60)
    setCorriendo(true)
    setConfigurando(false)
  }

  const pausar = () => {
    setCorriendo(false)
    clearInterval(intervalRef.current)
  }

  const reanudar = () => setCorriendo(true)

  const entregar = () => {
    clearInterval(intervalRef.current)
    setCorriendo(false)
    const usado = tiempoTotal * 60 - (tiempoRestante || 0)
    setTiempoUsado(usado)
    setTerminado(true)
  }

  const handleCorregir = async () => {
    setCorrigiendo(true)
    try {
      const ejerciciosConRespuestas = examen.ejercicios.map(ej => ({
        numero: ej.numero,
        enunciado: ej.enunciado,
        puntos: ej.puntos,
        respuesta: respuestas[ej.numero] || '(sin respuesta)'
      }))
      const res = await corregirExamen(ejerciciosConRespuestas, materia)
      setCorreccion(res.data)
    } catch {
      alert('Error al corregir. Intentá de nuevo.')
    }
    setCorrigiendo(false)
  }

  const formatTiempo = (segs) => {
    const m = Math.floor(segs / 60).toString().padStart(2, '0')
    const s = (segs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const porcentaje = tiempoRestante !== null
    ? (tiempoRestante / (tiempoTotal * 60)) * 100 : 100

  const colorCronometro = porcentaje > 50 ? '#10b981'
    : porcentaje > 25 ? '#f59e0b' : '#ef4444'

  return (
    <div className="fixed inset-0 bg-[#0a0b0f] z-50 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-white font-semibold">{examen.titulo}</h2>
          <p className="text-white/40 text-xs">{examen.ejercicios.length} ejercicios</p>
        </div>

        {!configurando && !terminado && (
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none"
                  stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle cx="28" cy="28" r="24" fill="none"
                  stroke={colorCronometro} strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - porcentaje / 100)}`}
                  className="transition-all duration-1000" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center
                text-white text-xs font-mono font-bold">
                {tiempoRestante !== null ? formatTiempo(tiempoRestante) : '--:--'}
              </span>
            </div>
            {corriendo
              ? <button onClick={pausar}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70
                    hover:bg-white/20 text-sm transition-all">⏸ Pausar</button>
              : <button onClick={reanudar}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white
                    hover:bg-indigo-500 text-sm transition-all">▶ Reanudar</button>
            }
          </div>
        )}

        <button onClick={onCerrar}
          className="text-white/40 hover:text-white text-sm px-3 py-1.5
            rounded-lg bg-white/8 hover:bg-white/15 transition-all">
          Salir
        </button>
      </div>

      {/* Configuración */}
      {configurando && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-[#1a1d27] border border-white/15 rounded-2xl p-8 w-96 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-white font-semibold text-lg mb-1">{examen.titulo}</h3>
            <p className="text-white/40 text-sm mb-6">
              {examen.ejercicios.length} ejercicios · {examen.ejercicios.reduce((a, e) => a + e.puntos, 0)} pts
            </p>
            <div className="mb-6">
              <label className="text-white/60 text-sm mb-2 block">
                Tiempo: <span className="text-white font-semibold">{tiempoTotal} min</span>
              </label>
              <input type="range" min="15" max="180" step="15"
                value={tiempoTotal}
                onChange={e => setTiempoTotal(Number(e.target.value))}
                className="w-full accent-indigo-500" />
              <div className="flex justify-between text-white/30 text-xs mt-1">
                <span>15 min</span><span>180 min</span>
              </div>
            </div>
            <button onClick={iniciar}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500
                text-white font-semibold transition-all">
              Comenzar ▶
            </button>
          </div>
        </div>
      )}

      {/* Examen */}
      {!configurando && !terminado && (
        <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">
          {examen.ejercicios.map((ej) => (
            <div key={ej.numero} className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-indigo-400 font-semibold">Ejercicio {ej.numero}</h3>
                <span className="text-white/40 text-sm">{ej.puntos} pts</span>
              </div>
              <div className="text-white/85 text-base leading-relaxed prose prose-invert prose-base max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {ej.enunciado}
                </ReactMarkdown>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/30 text-xs mb-2">Tu respuesta:</p>
                <textarea rows={5}
                  value={respuestas[ej.numero] || ''}
                  onChange={e => setRespuestas(p => ({ ...p, [ej.numero]: e.target.value }))}
                  placeholder="Escribí tu resolución acá..."
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3
                    text-white/85 text-sm resize-none outline-none
                    focus:border-indigo-500 transition-all placeholder:text-white/20" />
              </div>
            </div>
          ))}
          <button onClick={entregar}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
              text-white font-semibold transition-all mb-8">
            Entregar examen ✓
          </button>
        </div>
      )}

      {/* Pantalla final */}
      {terminado && (
        <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">

          {/* Resumen de entrega */}
          {!correccion && (
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">{tiempoRestante === 0 ? '⏰' : '✅'}</div>
              <h3 className="text-white text-2xl font-semibold mb-2">
                {tiempoRestante === 0 ? '¡Se acabó el tiempo!' : '¡Examen entregado!'}
              </h3>
              <p className="text-white/40 mb-6">
                Tiempo utilizado: {formatTiempo(tiempoUsado || tiempoTotal * 60)}
              </p>
              <button onClick={handleCorregir} disabled={corrigiendo}
                className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500
                  text-white font-semibold transition-all disabled:opacity-50">
                {corrigiendo ? '🔍 Corrigiendo...' : '🔍 Ver corrección con IA'}
              </button>
            </div>
          )}

          {/* Corrección */}
          {correccion && (
            <div>
              {/* Puntaje global */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 text-center">
                <p className="text-white/40 text-sm mb-2">Puntaje total</p>
                <p className="text-5xl font-bold mb-1"
                  style={{ color: correccion.puntaje_total >= correccion.puntaje_maximo * 0.6 ? '#10b981' : '#ef4444' }}>
                  {correccion.puntaje_total}
                  <span className="text-2xl text-white/30">/{correccion.puntaje_maximo}</span>
                </p>
                <p className="text-white/60 text-sm mt-3 italic">"{correccion.comentario_general}"</p>
              </div>

              {/* Corrección por ejercicio */}
              {correccion.correcciones.map((c) => {
                const ej = examen.ejercicios.find(e => e.numero === c.numero)
                return (
                  <div key={c.numero} className={`mb-6 rounded-2xl p-6 border
                    ${c.correcta
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${c.correcta ? 'text-emerald-400' : 'text-red-400'}`}>
                        {c.correcta ? '✓' : '✗'} Ejercicio {c.numero}
                      </h3>
                      <span className="text-white/60 text-sm">
                        {c.puntaje_obtenido}/{c.puntaje_maximo} pts
                      </span>
                    </div>

                    {/* Enunciado */}
                    <div className="text-white/50 text-sm mb-3 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {ej?.enunciado || ''}
                      </ReactMarkdown>
                    </div>

                    {/* Tu respuesta */}
                    <div className="bg-white/5 rounded-xl p-3 mb-3">
                      <p className="text-white/30 text-xs mb-1">Tu respuesta:</p>
                      <p className="text-white/70 text-sm whitespace-pre-wrap">
                        {respuestas[c.numero] || '(sin respuesta)'}
                      </p>
                    </div>

                    {/* Feedback */}
                    <div className={`rounded-xl p-3 text-sm
                      ${c.correcta ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                      <p className="font-semibold text-xs mb-1">Feedback:</p>
                      <div className="prose prose-sm max-w-none"
                        style={{ color: c.correcta ? '#6ee7b7' : '#fca5a5' }}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {c.feedback}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )
              })}

              <button onClick={onCerrar}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500
                  text-white font-semibold transition-all mb-8">
                Volver al estudio
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}