from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from db import models
from agents.teorico import stream_teorico
from agents.practico import stream_practico
import json
import os

router = APIRouter(prefix="/chat", tags=["chat"])

class MensajeRequest(BaseModel):
    materia_id: int
    agente: str
    mensaje: str
    sesion_id: int | None = None
    imagen_base64: str | None = None
    imagen_tipo: str | None = None

@router.get("/modelos")
def get_modelos():
    return {
        "teorico": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        "practico": os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    }

@router.post("/")
def enviar_mensaje(req: MensajeRequest, db: Session = Depends(get_db)):
    if req.sesion_id:
        sesion = db.query(models.Sesion).filter(models.Sesion.id == req.sesion_id).first()
        if not sesion:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
    else:
        sesion = models.Sesion(materia_id=req.materia_id, agente=req.agente)
        db.add(sesion)
        db.commit()
        db.refresh(sesion)

    mensajes_db = db.query(models.Mensaje).filter(
        models.Mensaje.sesion_id == sesion.id
    ).order_by(models.Mensaje.fecha).all()

    historial = [{"role": m.rol, "content": m.contenido} for m in mensajes_db]

    contenido_guardado = req.mensaje
    if req.imagen_base64:
        contenido_guardado = f"[imagen adjunta] {req.mensaje}"

    db.add(models.Mensaje(sesion_id=sesion.id, rol="user", contenido=contenido_guardado))
    db.commit()

    sesion_id = sesion.id

    def generar():
        yield f"data: {json.dumps({'sesion_id': sesion_id})}\n\n"

        # Búsqueda semántica automática
        try:
            from search import buscar
            resultados = buscar(req.mensaje, req.materia_id, n_resultados=3)
            contexto = ""
            if resultados:
                contexto = "\n\n--- Fragmentos relevantes de tus archivos ---\n"
                for r in resultados:
                    if r['score'] > 0.4:  # solo resultados suficientemente relevantes
                        contexto += f"\n[{r['nombre']}]:\n{r['chunk']}\n"
        except Exception as e:
            print(f"[search] Error en búsqueda semántica: {e}")
            contexto = ""

        # Mensaje enriquecido con contexto
        mensaje_enriquecido = req.mensaje
        if contexto:
            mensaje_enriquecido = f"{req.mensaje}{contexto}"

        if req.agente == "teorico":
            stream = stream_teorico(historial, mensaje_enriquecido, req.imagen_base64, req.imagen_tipo)
        else:
            stream = stream_practico(historial, mensaje_enriquecido, req.imagen_base64, req.imagen_tipo)

        respuesta_completa = ""
        for chunk in stream:
            delta = chunk.text or ""
            if delta:
                respuesta_completa += delta
                yield f"data: {json.dumps({'delta': delta})}\n\n"

        db.add(models.Mensaje(sesion_id=sesion_id, rol="assistant", contenido=respuesta_completa))
        db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(generar(), media_type="text/event-stream")

@router.get("/sesiones/{materia_id}")
def get_sesiones(materia_id: int, agente: str, db: Session = Depends(get_db)):
    sesiones = db.query(models.Sesion).filter(
        models.Sesion.materia_id == materia_id,
        models.Sesion.agente == agente
    ).order_by(models.Sesion.fecha.desc()).limit(20).all()

    result = []
    for s in sesiones:
        primer_msg = db.query(models.Mensaje).filter(
            models.Mensaje.sesion_id == s.id,
            models.Mensaje.rol == "user"
        ).first()
        result.append({
            "id": s.id,
            "fecha": s.fecha.strftime("%d/%m %H:%M"),
            "preview": (primer_msg.contenido[:55] + "...") if primer_msg and len(primer_msg.contenido) > 55
                       else (primer_msg.contenido if primer_msg else "Sesión vacía")
        })
    return result

@router.get("/historial/{sesion_id}")
def get_historial(sesion_id: int, db: Session = Depends(get_db)):
    return db.query(models.Mensaje).filter(
        models.Mensaje.sesion_id == sesion_id
    ).order_by(models.Mensaje.fecha).all()

@router.delete("/sesiones/{sesion_id}")
def eliminar_sesion(sesion_id: int, db: Session = Depends(get_db)):
    # Borrar mensajes primero por la foreign key
    db.query(models.Mensaje).filter(models.Mensaje.sesion_id == sesion_id).delete()
    db.query(models.Sesion).filter(models.Sesion.id == sesion_id).delete()
    db.commit()
    return {"ok": True}