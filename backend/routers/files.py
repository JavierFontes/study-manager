from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from search import indexar_archivo, desindexar_archivo
from examen import procesar_examen
from fastapi.responses import FileResponse
from pydantic import BaseModel as PydanticBase
import fitz
import shutil
import os
import json

router = APIRouter(prefix="/archivos", tags=["archivos"])

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "storage")

class RespuestasExamen(PydanticBase):
    ejercicios: list[dict]   # [{"numero": 1, "enunciado": "...", "respuesta": "..."}]
    materia: str

@router.post("/subir")
async def subir_archivo(
    materia_id: int = Form(...),
    tipo: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    materia = db.query(models.Materia).filter(models.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    destino_dir = os.path.join(STORAGE_DIR, f"materia_{materia_id}", tipo)
    os.makedirs(destino_dir, exist_ok=True)

    ruta = os.path.join(destino_dir, archivo.filename)
    with open(ruta, "wb") as f:
        shutil.copyfileobj(archivo.file, f)

    extension = archivo.filename.split(".")[-1].lower()
    nuevo = models.Archivo(
        nombre=archivo.filename,
        ruta=ruta,
        tipo=tipo,
        extension=extension,
        materia_id=materia_id
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    # Indexar en ChromaDB si es PDF
    if extension == "pdf":
        try:
            indexar_archivo(nuevo.id, materia_id, archivo.filename, ruta)
        except Exception as e:
            print(f"[search] Error indexando {archivo.filename}: {e}")

    return nuevo

@router.get("/materia/{materia_id}")
def get_archivos(materia_id: int, tipo: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Archivo).filter(models.Archivo.materia_id == materia_id)
    if tipo:
        query = query.filter(models.Archivo.tipo == tipo)
    return query.all()

@router.get("/leer/{archivo_id}")
def leer_pdf(archivo_id: int, db: Session = Depends(get_db)):
    archivo = db.query(models.Archivo).filter(models.Archivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    if archivo.extension != "pdf":
        raise HTTPException(status_code=400, detail="Solo se pueden leer PDFs")

    doc = fitz.open(archivo.ruta)
    texto = ""
    for pagina in doc:
        texto += pagina.get_text()
    doc.close()

    return {"texto": texto[:8000], "truncado": len(texto) > 8000}

@router.delete("/{archivo_id}")
def eliminar_archivo(archivo_id: int, db: Session = Depends(get_db)):
    archivo = db.query(models.Archivo).filter(models.Archivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    if os.path.exists(archivo.ruta):
        os.remove(archivo.ruta)
    desindexar_archivo(archivo_id)
    db.delete(archivo)
    db.commit()
    return {"ok": True}

from flashcards import procesar_pdf_a_flashcards

@router.post("/flashcards/{archivo_id}")
def generar_flashcards(archivo_id: int, db: Session = Depends(get_db)):
    archivo = db.query(models.Archivo).filter(models.Archivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    if archivo.extension != "pdf":
        raise HTTPException(status_code=400, detail="Solo se generan flashcards de PDFs")

    try:
        flashcards, ruta_pdf = procesar_pdf_a_flashcards(
            archivo.ruta,
            archivo.nombre,
            archivo.materia_id,
            STORAGE_DIR
        )

        nombre_fc = f"flashcards_{archivo.nombre}"
        nuevo = models.Archivo(
            nombre=nombre_fc,
            ruta=ruta_pdf,
            tipo="teorico",
            extension="pdf",
            materia_id=archivo.materia_id
        )
        db.add(nuevo)
        db.commit()

        return {"flashcards": flashcards, "archivo_id": nuevo.id}

    except Exception as e:
        import traceback
        traceback.print_exc()  # imprime el error completo en la terminal
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/examen/corregir")
def corregir_examen(data: RespuestasExamen):
    from google import genai
    from google.genai import types
    import os

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = f"""Sos un profesor universitario corrigiendo un examen de {data.materia}.
Corregí cada ejercicio y respondé ÚNICAMENTE con un JSON válido con este formato exacto:
{{
  "correcciones": [
    {{
      "numero": 1,
      "correcta": true,
      "puntaje_obtenido": 25,
      "puntaje_maximo": 25,
      "feedback": "Explicación detallada de qué estuvo bien o mal"
    }}
  ],
  "puntaje_total": 85,
  "puntaje_maximo": 100,
  "comentario_general": "Comentario global sobre el desempeño"
}}

Ejercicios y respuestas:
{json.dumps(data.ejercicios, ensure_ascii=False, indent=2)}
"""

    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.2)
    )

    import re
    raw = re.sub(r"```json|```", "", response.text.strip()).strip()
    return json.loads(raw)
  
@router.post("/examen/{materia_id}")
def generar_examen(
    materia_id: int,
    n: int = 4,
    dificultad: str = "intermedio",
    db: Session = Depends(get_db)
):
    materia = db.query(models.Materia).filter(models.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    # Tomar todos los archivos prácticos de la materia
    archivos = db.query(models.Archivo).filter(
        models.Archivo.materia_id == materia_id,
        models.Archivo.tipo == "practico",
        models.Archivo.extension == "pdf"
    ).all()

    # Si no hay prácticos, usar los teóricos
    if not archivos:
        archivos = db.query(models.Archivo).filter(
            models.Archivo.materia_id == materia_id,
            models.Archivo.extension == "pdf"
        ).all()

    if not archivos:
        raise HTTPException(status_code=400, detail="No hay PDFs en esta materia para generar el examen")

    try:
        examen, ruta_pdf = procesar_examen(
            [a.ruta for a in archivos],
            n, dificultad, materia_id,
            materia.nombre, STORAGE_DIR
        )

        nuevo = models.Archivo(
            nombre=f"examen_simulado_{materia.nombre}.pdf",
            ruta=ruta_pdf,
            tipo="practico",
            extension="pdf",
            materia_id=materia_id
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)

        return {"examen": examen, "archivo_id": nuevo.id}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    

@router.get("/ver/{archivo_id}")
def ver_archivo(archivo_id: int, db: Session = Depends(get_db)):
    archivo = db.query(models.Archivo).filter(models.Archivo.id == archivo_id).first()
    if not archivo:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    if not os.path.exists(archivo.ruta):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco")
    return FileResponse(
        archivo.ruta,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"}  # inline = mostrar, no descargar
    )

class NotaCreate(PydanticBase):
    contenido: str

@router.get("/notas/{archivo_id}")
def get_notas(archivo_id: int, db: Session = Depends(get_db)):
    return db.query(models.Nota).filter(
        models.Nota.archivo_id == archivo_id
    ).order_by(models.Nota.fecha).all()

@router.post("/notas/{archivo_id}")
def crear_nota(archivo_id: int, data: NotaCreate, db: Session = Depends(get_db)):
    nota = models.Nota(archivo_id=archivo_id, contenido=data.contenido)
    db.add(nota)
    db.commit()
    db.refresh(nota)
    return nota

@router.delete("/notas/eliminar/{nota_id}")
def eliminar_nota(nota_id: int, db: Session = Depends(get_db)):
    nota = db.query(models.Nota).filter(models.Nota.id == nota_id).first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    db.delete(nota)
    db.commit()
    return {"ok": True}



