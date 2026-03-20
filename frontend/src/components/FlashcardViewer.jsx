import { useState } from 'react'

export default function FlashcardViewer({ flashcards, nombreArchivo, onCerrar }) {
  const [actual, setActual] = useState(0)
  const [volteada, setVolteada] = useState(false)
  const [completadas, setCompletadas] = useState(new Set())

  const card = flashcards[actual]
  const total = flashcards.length

  const siguiente = () => {
    setVolteada(false)
    setTimeout(() => setActual(i => Math.min(i + 1, total - 1)), 150)
  }

  const anterior = () => {
    setVolteada(false)
    setTimeout(() => setActual(i => Math.max(i - 1, 0)), 150)
  }

  const marcarCompletada = () => {
    setCompletadas(prev => new Set([...prev, actual]))
    if (actual < total - 1) siguiente()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-[#1a1d27] border border-white/15 rounded-2xl w-full max-w-2xl
        shadow-2xl flex flex-col gap-4 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Flashcards</h2>
            <p className="text-white/40 text-xs mt-0.5">{nombreArchivo}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm">
              {actual + 1} / {total}
            </span>
            <span className="text-emerald-400 text-sm">
              ✓ {completadas.size}
            </span>
            <button onClick={onCerrar}
              className="text-white/40 hover:text-white transition-all text-lg">✕</button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((actual + 1) / total) * 100}%` }}
          />
        </div>

        {/* Tarjeta con efecto flip */}
        <div
          className="relative cursor-pointer select-none"
          style={{ perspective: '1000px', height: '260px' }}
          onClick={() => setVolteada(v => !v)}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: volteada ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Frente */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center
                bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-8 text-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-white/30 text-xs uppercase tracking-widest mb-4">
                Concepto
              </span>
              <p className="text-white text-xl font-semibold leading-relaxed">
                {card.frente}
              </p>
              <span className="text-white/20 text-xs mt-6">
                Cliqueá para ver la definición
              </span>
            </div>

            {/* Dorso */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center
                bg-emerald-600/15 border border-emerald-500/30 rounded-2xl p-8 text-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <span className="text-white/30 text-xs uppercase tracking-widest mb-4">
                Definición
              </span>
              <p className="text-white/85 text-base leading-relaxed overflow-y-auto max-h-44">
                {card.dorso}
              </p>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={anterior}
            disabled={actual === 0}
            className="px-4 py-2 rounded-xl bg-white/8 text-white/60
              hover:text-white hover:bg-white/15 transition-all disabled:opacity-30 text-sm"
          >
            ← Anterior
          </button>

          <button
            onClick={marcarCompletada}
            className={`flex-1 py-2 rounded-xl text-sm transition-all
              ${completadas.has(actual)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
          >
            {completadas.has(actual) ? '✓ Completada' : '✓ La sé'}
          </button>

          <button
            onClick={siguiente}
            disabled={actual === total - 1}
            className="px-4 py-2 rounded-xl bg-white/8 text-white/60
              hover:text-white hover:bg-white/15 transition-all disabled:opacity-30 text-sm"
          >
            Siguiente →
          </button>
        </div>

        {/* Resumen final */}
        {completadas.size === total && (
          <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl
            p-4 text-center">
            <p className="text-emerald-400 font-semibold">
              🎉 ¡Completaste todas las flashcards!
            </p>
            <p className="text-white/40 text-xs mt-1">
              El PDF de repaso fue guardado en tus archivos teóricos
            </p>
          </div>
        )}
      </div>
    </div>
  )
}