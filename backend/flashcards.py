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

PROMPT_FLASHCARDS = """
Analizá el siguiente texto académico y extraé los conceptos más importantes para estudiar.
Para cada concepto creá una flashcard con:
- "frente": el nombre del concepto, definición, teorema o proposición (breve, max 15 palabras)
- "dorso": la explicación completa, formal y clara (puede ser más larga)

Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, con este formato exacto:
[
  {"frente": "...", "dorso": "..."},
  {"frente": "...", "dorso": "..."}
]

Extraé entre 8 y 20 flashcards según la densidad del contenido.
Priorizá: definiciones formales, teoremas, proposiciones, corolarios, propiedades y fórmulas clave.

Texto:
"""

def extraer_flashcards(texto: str) -> list[dict]:
    """Llama a Gemini para extraer flashcards del texto."""
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=PROMPT_FLASHCARDS + texto[:12000],
        config=types.GenerateContentConfig(temperature=0.2)
    )

    raw = response.text.strip()

    # Limpiar posibles ```json ``` que Gemini a veces agrega
    raw = re.sub(r"```json|```", "", raw).strip()

    return json.loads(raw)

def limpiar_texto(texto: str) -> str:
    """Reemplaza caracteres fuera de latin-1 por equivalentes simples."""
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

def generar_pdf_flashcards(flashcards: list[dict], nombre_archivo: str, destino: str) -> str:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    titulo = limpiar_texto(f"Flashcards: {nombre_archivo}")
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_fill_color(30, 30, 50)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 12, titulo, fill=True, ln=True, align="C")
    pdf.ln(6)

    for i, card in enumerate(flashcards, 1):
        frente = limpiar_texto(card['frente'])
        dorso = limpiar_texto(card['dorso'])

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_fill_color(60, 80, 180)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 8, f"  #{i} - {frente}", fill=True, ln=True)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_fill_color(240, 242, 255)
        pdf.set_text_color(20, 20, 40)
        pdf.multi_cell(0, 7, f"  {dorso}", fill=True)
        pdf.ln(4)

    ruta = os.path.join(destino, f"flashcards_{nombre_archivo}.pdf")
    pdf.output(ruta)
    return ruta

def procesar_pdf_a_flashcards(archivo_ruta: str, archivo_nombre: str,
                               materia_id: int, storage_dir: str) -> tuple[list[dict], str]:
    """Pipeline completo: lee PDF → extrae flashcards → genera PDF → retorna datos."""
    # Leer PDF
    doc = fitz.open(archivo_ruta)
    texto = ""
    for pagina in doc:
        texto += pagina.get_text()
    doc.close()

    # Extraer flashcards con Gemini
    flashcards = extraer_flashcards(texto)

    # Guardar PDF de flashcards en carpeta teórico
    destino_dir = os.path.join(storage_dir, f"materia_{materia_id}", "teorico")
    os.makedirs(destino_dir, exist_ok=True)
    ruta_pdf = generar_pdf_flashcards(flashcards, archivo_nombre.replace(".pdf", ""), destino_dir)

    return flashcards, ruta_pdf