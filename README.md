# StudyOS 📖

Un administrador de archivos de estudio con IA integrada, construido con Electron + React + FastAPI.

![StudyOS](https://img.shields.io/badge/version-1.0.0-indigo) ![Python](https://img.shields.io/badge/Python-3.11+-blue) ![Node](https://img.shields.io/badge/Node-20+-green) ![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)

---

## ¿Qué es StudyOS?

StudyOS es una aplicación de escritorio diseñada para estudiantes universitarios. Combina un administrador de archivos organizado por materias con dos agentes de IA especializados: uno teórico y uno práctico, que leen tus PDFs y te ayudan a estudiar de forma inteligente.

---

## ✨ Features

### Organización
- Hasta 6 materias con colores personalizados
- Sección teórica y práctica por materia
- Redimensionado de paneles arrastrando los bordes

### Agente Teórico 🧠
- Explica conceptos, definiciones y teoremas con intuición informal + definición formal
- Realiza demostraciones paso a paso justificando cada uno
- Siempre incluye ejemplos prácticos
- Resume PDFs y pregunta sobre qué profundizar

### Agente Práctico ✏️
- Explica enunciados confusos
- Guía al estudiante con preguntas orientadoras sin resolver el ejercicio directamente
- Corrige respuestas y da feedback sin revelar la solución
- Crea ejercicios, parciales y exámenes personalizados

### IA Integrada
- **Búsqueda semántica**: el agente encuentra automáticamente fragmentos relevantes de tus PDFs al hacer una pregunta
- **Flashcards automáticas**: extrae definiciones y conceptos clave de un PDF y los convierte en tarjetas de estudio con efecto flip
- **Examen simulado**: genera exámenes con cronómetro y corrección automática con IA
- **Notas al margen**: escribí notas sobre un PDF y la IA las usa como contexto

### Visor de archivos
- PDFs con visualización nativa
- Imágenes
- Markdown con renderizado
- Código fuente con syntax highlighting

### Personalización
- 4 temas: Midnight, Sepia, Claro y Negro
- Historial de conversaciones por materia y agente

---

## 🚀 Instalación

### Requisitos

- Python 3.11 o superior
- Node.js 20 o superior
- Una API key de Google Gemini (gratuita en [aistudio.google.com](https://aistudio.google.com))

### 1. Clonar el repositorio

```bash
git clone https://github.com/JavierFontes/study-manager.git
cd study-manager
```

### 2. Configurar el backend

```bash
cd backend
python -m venv venv
```

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

Instalar dependencias:
```bash
pip install -r requirements.txt
```

Crear el archivo `.env` en la carpeta `backend/`:
```
GEMINI_API_KEY=tu_clave_aqui
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Configurar el frontend

```bash
cd frontend
npm install
```

---

## ▶️ Uso en desarrollo

Necesitás dos terminales abiertas:

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

La app abre automáticamente como ventana de escritorio.

---

## 📦 Build como ejecutable (.exe)

### 1. Empaquetar el backend

```bash
cd backend
venv\Scripts\activate
pyinstaller --onefile --name studyos-backend \
  --hidden-import=uvicorn.logging \
  --hidden-import=uvicorn.loops.auto \
  --hidden-import=uvicorn.protocols.http.auto \
  --hidden-import=uvicorn.protocols.websockets.auto \
  --hidden-import=uvicorn.lifespan.on \
  --hidden-import=chromadb.telemetry.product.posthog \
  --collect-all=chromadb \
  run.py
```

### 2. Empaquetar el frontend

```bash
cd frontend
npm run build
npx electron-builder --win
```

El ejecutable queda en `frontend/release/win-unpacked/StudyOS.exe`.

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Electron + React + Vite |
| Estilos | Tailwind CSS |
| Backend | FastAPI + Python |
| Base de datos | SQLite + SQLAlchemy |
| IA | Google Gemini 2.5 Flash |
| Búsqueda semántica | ChromaDB + text-embedding-004 |
| PDFs | PyMuPDF |
| Renderizado matemático | KaTeX |

---

## 📁 Estructura del proyecto

```
study-manager/
├── backend/
│   ├── agents/          # Agente teórico y práctico
│   ├── db/              # Modelos y base de datos SQLite
│   ├── routers/         # Endpoints de la API
│   ├── search.py        # Búsqueda semántica con ChromaDB
│   ├── flashcards.py    # Generador de flashcards
│   ├── examen.py        # Generador de exámenes simulados
│   └── main.py          # Entrada de la API
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas principales
│   │   ├── api/         # Cliente HTTP
│   │   └── themes.js    # Temas visuales
│   └── electron.cjs     # Proceso principal de Electron
└── storage/             # Archivos subidos por materia
```

---

## ⚠️ Notas importantes

- La API key de Gemini es **gratuita** con 250 requests/día en el free tier
- Los archivos subidos se guardan localmente en la carpeta `storage/`
- La base de datos SQLite se crea automáticamente en el primer inicio
- Los PDFs se indexan automáticamente al subirlos para la búsqueda semántica
