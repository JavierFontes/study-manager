import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 300000
})

export const getMaterias = () => api.get('/materias')
export const crearMateria = (nombre, color) =>
  api.post('/materias', { nombre, color })

export const getArchivos = (materiaId, tipo) =>
  api.get(`/archivos/materia/${materiaId}`, { params: { tipo } })
export const subirArchivo = (materiaId, tipo, archivo) => {
  const form = new FormData()
  form.append('materia_id', materiaId)
  form.append('tipo', tipo)
  form.append('archivo', archivo)
  return api.post('/archivos/subir', form)
}
export const eliminarArchivo = (id) => api.delete(`/archivos/${id}`)
export const leerPDF = (id) => api.get(`/archivos/leer/${id}`)

export const getModelos = () => api.get('/chat/modelos')
export const getSesiones = (materiaId, agente) =>
  api.get(`/chat/sesiones/${materiaId}`, { params: { agente } })
export const getHistorial = (sesionId) =>
  api.get(`/chat/historial/${sesionId}`)

export const eliminarSesion = (sesionId) =>
  api.delete(`/chat/sesiones/${sesionId}`)

export const eliminarMateria = (materiaId) =>
  api.delete(`/materias/${materiaId}`)

export const generarFlashcards = (archivoId) =>
  api.post(`/archivos/flashcards/${archivoId}`)

export const generarExamen = (materiaId, n, dificultad) =>
  api.post(`/archivos/examen/${materiaId}`, null, { params: { n, dificultad } })

export const corregirExamen = (ejercicios, materia) =>
  api.post('/archivos/examen/corregir', { ejercicios, materia })

export const getNotas = (archivoId) =>
  api.get(`/archivos/notas/${archivoId}`)

export const crearNota = (archivoId, contenido) =>
  api.post(`/archivos/notas/${archivoId}`, { contenido })

export const eliminarNota = (notaId) =>
  api.delete(`/archivos/notas/eliminar/${notaId}`)