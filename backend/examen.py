from google import genai
from google.genai import types
from fpdf import FPDF
import fitz
import json
import os
import re
import sys
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

load_dotenv(os.path.join(base_dir, '.env'))

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

PROMPT_EXAMEN = """
Sos un profesor universitario creando un examen parcial.
Basándote en el siguiente material de estudio, generá un examen con exactamente {n} ejercicios.

Reglas:
- Los ejercicios deben ser variados en tipo (cálculo, demostración, aplicación, análisis)
- Deben tener dificultad {dificultad}
- Cada ejercicio debe ser autosuficiente (no depender del anterior)
- Incluí todos los datos necesarios para resolver cada ejercicio

Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, con este formato exacto:
{{
  "titulo": "Examen Parcial - [nombre del tema]",
  "ejercicios": [
    {{
      "numero": 1,
      "enunciado": "...",
      "puntos": 25
    }}
  ]
}}

Material de estudio:
{material}
"""

def limpiar_texto(texto: str) -> str:
    reemplazos = {
        '\u2014': '-', '\u2013': '-', '\u2018': "'", '\u2019': "'",
        '\u201c': '"', '\u201d': '"', '\u2026': '...', '\u2022': '*',
        '\u00e1': 'a', '\u00e9': 'e', '\u00ed': 'i', '\u00f3': 'o', '\u00fa': 'u',
        '\u00c1': 'A', '\u00c9': 'E', '\u00cd': 'I', '\u00d3': 'O', '\u00da': 'U',
        '\u00f1': 'n', '\u00d1': 'N',
    }
    for original, reemplazo in reemplazos.items():
        texto = texto.replace(original, reemplazo)
    return texto.encode('latin-1', errors='replace').decode('latin-1')

def generar_ejercicios(material: str, n: int, dificultad: str) -> dict:
    prompt = PROMPT_EXAMEN.format(
        n=n, dificultad=dificultad, material=material[:10000]
    )
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.7)
    )
    raw = re.sub(r"```json|```", "", response.text.strip()).strip()
    return json.loads(raw)

def generar_pdf_examen(examen: dict, destino: str, nombre_materia: str) -> str:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Encabezado
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_fill_color(20, 20, 40)
    pdf.set_text_color(255, 255, 255)
    titulo = limpiar_texto(examen.get("titulo", "Examen Simulado"))
    pdf.cell(0, 12, titulo, fill=True, ln=True, align="C")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, f"Materia: {limpiar_texto(nombre_materia)}  |  Nombre: _______________  |  Fecha: ___________", ln=True)
    pdf.ln(4)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # Ejercicios
    for ej in examen.get("ejercicios", []):
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(40, 40, 180)
        pdf.cell(0, 8, f"Ejercicio {ej['numero']} ({ej['puntos']} pts)", ln=True)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(30, 30, 30)
        enunciado = limpiar_texto(ej['enunciado'])
        pdf.multi_cell(0, 6, enunciado)
        pdf.ln(3)

        # Espacio para respuesta
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 6, "Respuesta:", ln=True)
        for _ in range(6):
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y() + 5, 200, pdf.get_y() + 5)
            pdf.ln(7)
        pdf.ln(4)

    ruta = os.path.join(destino, f"examen_simulado_{len(os.listdir(destino))+1}.pdf")
    pdf.output(ruta)
    return ruta

def procesar_examen(archivos_rutas: list[str], n: int,
                    dificultad: str, materia_id: int,
                    nombre_materia: str, storage_dir: str) -> tuple[dict, str]:
    # Extraer texto de todos los archivos prácticos
    material = ""
    for ruta in archivos_rutas:
        if ruta.endswith(".pdf"):
            doc = fitz.open(ruta)
            for pagina in doc:
                material += pagina.get_text()
            doc.close()
        if len(material) > 12000:
            break

    examen = generar_ejercicios(material, n, dificultad)

    destino_dir = os.path.join(storage_dir, f"materia_{materia_id}", "practico")
    os.makedirs(destino_dir, exist_ok=True)
    ruta_pdf = generar_pdf_examen(examen, destino_dir, nombre_materia)

    return examen, ruta_pdf