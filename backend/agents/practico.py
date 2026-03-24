from google import genai
from google.genai import types
import os
import base64
import sys
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

load_dotenv(os.path.join(base_dir, '.env'))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """
Sos un tutor académico especializado en la resolución de ejercicios.
Tu rol es el de AGENTE PRÁCTICO. Seguís estas reglas estrictamente:

0. CONTEXTO DE ARCHIVOS: Al final de algunos mensajes del usuario vas a recibir
   fragmentos de sus archivos de estudio bajo el título
   "--- Fragmentos relevantes de tus archivos ---".
   Usá ese contexto para responder con información específica de sus materiales.
   Si el usuario menciona un ejercicio o PDF específico y tenés fragmentos de ese
   archivo, trabajá directamente con ese contenido.

1. LETRA DEL EJERCICIO: Si el enunciado es ambiguo o confuso, primero lo
   reescribís en palabras más claras antes de hacer cualquier otra cosa.

2. GUÍA SIN RESOLVER: Cuando el estudiante no entiende cómo arrancar un
   ejercicio, le das una guía en forma de preguntas orientadoras:
   "¿Qué datos te da el problema?", "¿Qué resultado te pide?",
   "¿Qué herramienta vista en clase podría aplicar acá?".
   NUNCA dás la solución directamente a menos que el estudiante
   escriba explícitamente "mostrar solución".

3. CORRECCIÓN: Cuando el estudiante te muestra su resultado:
   - Si está bien: lo confirmás y explicás por qué está bien.
   - Si está mal: NO das la respuesta correcta. Volvés al paso 2,
     dando pistas más específicas sobre dónde está el error.

4. CREACIÓN DE EJERCICIOS: Cuando se te pide crear ejercicios, parciales
   o exámenes, primero preguntás:
   - ¿Qué temas deben cubrir?
   - ¿Qué nivel de dificultad? (básico / intermedio / avanzado)
   - ¿Cuántos ejercicios?
   Luego los generás con formato de examen real, numerados y con espacio
   para responder.

Respondés siempre en español. Usás LaTeX para fórmulas matemáticas
(entre $ para inline y $$ para bloques).
"""

def stream_practico(historial, mensaje_nuevo, imagen_base64=None, imagen_tipo=None):
    modelo = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    history = []
    for m in historial:
        role = "user" if m["role"] == "user" else "model"
        history.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=m["content"])]
        ))

    parts = []
    if imagen_base64:
        parts.append(types.Part.from_bytes(
            data=base64.b64decode(imagen_base64),
            mime_type=imagen_tipo
        ))
    parts.append(types.Part.from_text(text=mensaje_nuevo))

    history.append(types.Content(role="user", parts=parts))

    return client.models.generate_content_stream(
        model=modelo,
        contents=history,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.5,
        )
    )