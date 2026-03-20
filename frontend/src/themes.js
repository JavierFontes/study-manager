export const TEMAS = {
  midnight: {
    nombre: 'Midnight',
    color: '#1a1d27',
    vars: {
      '--bg-primary': '#0f1117',
      '--bg-secondary': '#0d0f14',
      '--bg-card': 'rgba(255,255,255,0.05)',
      '--bg-input': 'rgba(255,255,255,0.08)',
      '--border': 'rgba(255,255,255,0.1)',
      '--border-focus': '#6366f1',
      '--text-primary': 'rgba(255,255,255,0.85)',
      '--text-secondary': 'rgba(255,255,255,0.5)',
      '--text-muted': 'rgba(255,255,255,0.25)',
      '--accent': '#6366f1',
      '--accent-hover': '#4f46e5',
      '--accent-soft': 'rgba(99,102,241,0.15)',
      '--msg-user-bg': '#6366f1',
      '--msg-assistant-bg': 'rgba(255,255,255,0.08)',
    }
  },
  sepia: {
    nombre: 'Sepia',
    color: '#c8853a',
    vars: {
      '--bg-primary': '#1c1510',
      '--bg-secondary': '#181210',
      '--bg-card': 'rgba(255,220,150,0.06)',
      '--bg-input': 'rgba(255,220,150,0.08)',
      '--border': 'rgba(255,200,100,0.15)',
      '--border-focus': '#c8853a',
      '--text-primary': '#e8d5b0',
      '--text-secondary': '#a89070',
      '--text-muted': '#6b5a40',
      '--accent': '#c8853a',
      '--accent-hover': '#b07030',
      '--accent-soft': 'rgba(200,133,58,0.15)',
      '--msg-user-bg': '#8b5e2a',
      '--msg-assistant-bg': 'rgba(255,200,100,0.07)',
    }
  },
  ocean: {
    nombre: 'Claro',
    color: '#e8e8e0',
    vars: {
      '--bg-primary': '#f5f5f0',
      '--bg-secondary': '#eeede8',
      '--bg-card': 'rgba(0,0,0,0.04)',
      '--bg-input': 'rgba(0,0,0,0.06)',
      '--border': 'rgba(0,0,0,0.1)',
      '--border-focus': '#6366f1',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#555550',
      '--text-muted': '#999990',
      '--accent': '#6366f1',
      '--accent-hover': '#4f46e5',
      '--accent-soft': 'rgba(99,102,241,0.12)',
      '--msg-user-bg': '#6366f1',
      '--msg-assistant-bg': 'rgba(0,0,0,0.05)',
    }
  },
  forest: {
    nombre: 'Negro',
    color: '#000000',
    vars: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#050505',
      '--bg-card': 'rgba(255,255,255,0.04)',
      '--bg-input': 'rgba(255,255,255,0.06)',
      '--border': 'rgba(255,255,255,0.08)',
      '--border-focus': '#6366f1',
      '--text-primary': 'rgba(255,255,255,0.9)',
      '--text-secondary': 'rgba(255,255,255,0.45)',
      '--text-muted': 'rgba(255,255,255,0.2)',
      '--accent': '#6366f1',
      '--accent-hover': '#4f46e5',
      '--accent-soft': 'rgba(99,102,241,0.15)',
      '--msg-user-bg': '#6366f1',
      '--msg-assistant-bg': 'rgba(255,255,255,0.05)',
    }
  }
}

export function aplicarTema(temaKey) {
  const tema = TEMAS[temaKey]
  if (!tema) return
  const root = document.documentElement
  Object.entries(tema.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  localStorage.setItem('tema', temaKey)
}

export function cargarTema() {
  const guardado = localStorage.getItem('tema') || 'midnight'
  aplicarTema(guardado)
  return guardado
}