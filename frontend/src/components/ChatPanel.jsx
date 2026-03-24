import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { getModelos, getHistorial } from '../api/client'
import SessionsList from './SessionsList'
import React from 'react' // Asegúrate de tener React importado

const MensajeIndividual = React.memo(({ m }) => {
  return (
    <div className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
      {(m.contenido || m.imagenPreview) && (
        <div
          className={`max-w-[80%] px-4 py-3 rounded-2xl text-base leading-relaxed
            ${m.rol === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
          style={{
            background: m.rol === 'user' ? 'var(--accent)' : 'var(--bg-card)',
            border: m.rol === 'user' ? 'none' : '1px solid var(--border)',
            color: m.rol === 'user' ? 'white' : 'var(--text-primary)'
          }}
        >
          {m.imagenPreview && (
            <img src={m.imagenPreview} alt="adjunto"
              className="max-w-xs rounded-lg mb-2 max-h-48 object-contain" />
          )}

          {m.rol === 'assistant' ? (
            <div
              className="prose prose-base max-w-none
                prose-p:my-1
                prose-code:px-1 prose-code:rounded prose-code:text-xs
                prose-code:before:content-none prose-code:after:content-none
                prose-li:my-0.5"
              style={{
                color: 'var(--text-primary)',
                '--tw-prose-headings': 'var(--text-primary)',
                '--tw-prose-bold': 'var(--text-primary)',
                '--tw-prose-code': 'var(--accent)',
                '--tw-prose-bullets': 'var(--text-secondary)',
                '--tw-prose-counters': 'var(--text-secondary)',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {m.contenido || '▋'}
              </ReactMarkdown>
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{m.contenido}</span>
          )}
        </div>
      )}
    </div>
  );
});

MensajeIndividual.displayName = 'MensajeIndividual';

const ChatPanel = forwardRef(function ChatPanel({ materia, agente }, ref) {
  const [mensajes, setMensajes] = useState([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [sesionId, setSesionId] = useState(null)
  const [modelos, setModelos] = useState({})
  const [imagen, setImagen] = useState(null)
  const bottomRef = useRef()
  const inputRef = useRef()
  const imagenRef = useRef()
  const containerRef = useRef()
  const [mostrarBajar, setMostrarBajar] = useState(false)

  useEffect(() => {
    getModelos().then(r => setModelos(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    nuevaConversacion()
  }, [materia?.id, agente])

  useEffect(() => {
  const container = containerRef.current
  if (!container) return
  const handleScroll = () => {
    const distancia = container.scrollHeight - container.scrollTop - container.clientHeight
    setMostrarBajar(distancia > 200)
  }
  container.addEventListener('scroll', handleScroll)
  return () => container.removeEventListener('scroll', handleScroll)
}, [])

  const nuevaConversacion = () => {
    setMensajes([])
    setSesionId(null)
    setInput('')
    setImagen(null)
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !cargando) return; // Solo auto-scroll si está cargando

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 400;

    if (isAtBottom) {
      // Usamos 'auto' durante el streaming para que no se "trabe"
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'auto' 
      });
    }
  }, [mensajes, cargando]);
  
  const cargarSesion = async (sesion) => {
    try {
      const res = await getHistorial(sesion.id)
      const msgs = res.data.map(m => ({ rol: m.rol, contenido: m.contenido }))
      setMensajes(msgs)
      setSesionId(sesion.id)
    } catch { console.error('Error cargando sesión') }
  }

  const handleImagen = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]
      setImagen({ base64, tipo: file.type, preview: e.target.result })
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        handleImagen(item.getAsFile())
        break
      }
    }
  }

  const enviar = async (texto = input) => {
    if ((!texto.trim() && !imagen) || cargando) return
    let buffer = "";
    let interval = null;
    const msg = texto.trim()
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    const imgActual = imagen
    setImagen(null)

    const msgUsuario = {
      rol: 'user',
      contenido: msg || '(imagen)',
      imagenPreview: imgActual?.preview || null
    }
    setMensajes(prev => [...prev, msgUsuario, { rol: 'assistant', contenido: '' }])
    setCargando(true)

    try {
      const body = {
        materia_id: materia.id,
        agente,
        mensaje: msg || 'Analizá esta imagen',
        sesion_id: sesionId,
        imagen_base64: imgActual?.base64 || null,
        imagen_tipo: imgActual?.tipo || null
      }

      const response = await fetch('http://localhost:8000/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      interval = setInterval(() => {
        if (buffer.length > 0) {
          const chunk = buffer;
          buffer = "";

          setMensajes(prev => {
            const copia = [...prev];
            const lastIndex = copia.length - 1;

            if (lastIndex >= 0) {
              copia[lastIndex] = {
                ...copia[lastIndex],
                contenido: copia[lastIndex].contenido + chunk
              };
            }

            return copia;
          });
        }
      }, 150);

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          clearInterval(interval);
          setCargando(false);
          return;
        }

        const lines = decoder.decode(value).split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6)

          if (data === '[DONE]') {
            clearInterval(interval);

            if (buffer.length > 0) {
              setMensajes(prev => {
                const copia = [...prev];
                const lastIndex = copia.length - 1;

                if (lastIndex >= 0) {
                  copia[lastIndex] = {
                    ...copia[lastIndex],
                    contenido: copia[lastIndex].contenido + buffer
                  };
                }

                return copia;
              });
              buffer = "";
            }

            if (SessionsList.recargar) SessionsList.recargar();

            setCargando(false);
            return;
          }

          try {
            const parsed = JSON.parse(data)

            if (parsed.sesion_id) setSesionId(parsed.sesion_id)

            if (parsed.delta) {
              buffer += parsed.delta;
            }

          } catch (err) {
            console.error("ERROR REAL:", err);
          }
        }
      }
    } catch {
      setMensajes(prev => {
        const copia = [...prev]
        copia[copia.length - 1] = {
          ...copia[copia.length - 1],
          contenido: '⚠️ Error al conectar con el agente.'
        }
        return copia
      })
    }
    setCargando(false)
  }

  const enviarPDF = (texto, nombre, truncado) => {
    const msg = `Te comparto el contenido del archivo "${nombre}"${truncado ? ' (truncado por longitud)' : ''}:\n\n${texto}`
    enviar(msg)
  }

  useImperativeHandle(ref, () => ({ enviarPDF }))

  const modeloActual = agente === 'teorico' ? modelos.teorico : modelos.practico

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Indicador de modelo */}
      <div className="flex items-center px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-mono ml-2" style={{ color: 'var(--text-muted)' }}>
          {modeloActual || 'cargando...'}
        </span>
      </div>

      {/* Historial de sesiones */}
      <SessionsList
        materia={materia}
        agente={agente}
        sesionActiva={sesionId}
        onSelect={cargarSesion}
        onNueva={nuevaConversacion}
        onEliminar={nuevaConversacion}
      />

      {/* Mensajes */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {mensajes.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3">{agente === 'teorico' ? '🧠' : '✏️'}</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {agente === 'teorico'
                ? 'Preguntame sobre conceptos, teoremas o demostraciones'
                : 'Mandame un ejercicio para guiarte o crear uno nuevo'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Podés pegar imágenes con Ctrl+V
            </p>
          </div>
        )}

        {mensajes.map((m, i) => (
          <MensajeIndividual key={i} m={m} agente={agente} />
        ))}

        {cargando && mensajes[mensajes.length - 1]?.contenido === '' && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]"
                  style={{ background: 'var(--text-muted)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]"
                  style={{ background: 'var(--text-muted)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]"
                  style={{ background: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>
        )}
        {mostrarBajar && (
          <div className="sticky bottom-4 flex justify-center">
            <button
              onClick={() => {
                containerRef.current?.scrollTo({
                  top: containerRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs shadow-lg transition-all"
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ↓
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Preview imagen adjunta */}
      {imagen && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className="relative">
            <img src={imagen.preview} alt="preview"
              className="h-16 w-16 object-cover rounded-lg"
              style={{ border: '1px solid var(--border)' }} />
            <button
              onClick={() => setImagen(null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500
                text-white text-[10px] flex items-center justify-center"
            >✕</button>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Imagen adjunta · Ctrl+V para cambiar
          </span>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => imagenRef.current.click()}
            className="self-end text-base pb-0.5 transition-all"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            title="Adjuntar imagen"
          >🖼</button>
          <input ref={imagenRef} type="file" className="hidden"
            accept="image/*" onChange={e => handleImagen(e.target.files[0])} />
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }}}
            onPaste={handlePaste}
            placeholder={agente === 'teorico' ? 'Explicame... (Ctrl+V para pegar imagen)' : 'Tengo este ejercicio...'}
            rows={1}
            style={{
              maxHeight: '200px', overflowY: 'auto',
              background: 'transparent', color: 'var(--text-primary)',
              caretColor: 'var(--accent)'
            }}
            className="flex-1 text-base resize-none outline-none placeholder:opacity-30"
          />
          <button
            onClick={() => enviar()}
            disabled={cargando || (!input.trim() && !imagen)}
            className="self-end text-lg leading-none pb-0.5 transition-all disabled:opacity-30"
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >↑</button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          Enter para enviar · Shift+Enter nueva línea · Ctrl+V para pegar imagen
        </p>
      </div>
    </div>
  )
})

export default ChatPanel