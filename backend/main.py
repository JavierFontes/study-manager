from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine, SessionLocal
from db import models
from db.models import Materia
from routers import chat, files

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Study Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "app://.", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(files.router)

@app.get("/")
def root():
    return {"status": "ok", "mensaje": "Study Manager API corriendo"}

@app.get("/materias")
def get_materias():
    db = SessionLocal()
    materias = db.query(Materia).all()
    db.close()
    return materias

@app.post("/materias")
def crear_materia(nombre: str = Body(...), color: str = Body("#6366f1")):
    db = SessionLocal()
    m = Materia(nombre=nombre, color=color)
    db.add(m)
    db.commit()
    db.refresh(m)
    db.close()
    return m

@app.delete("/materias/{materia_id}")
def eliminar_materia(materia_id: int):
    db = SessionLocal()
    # Borrar en cascada: mensajes → sesiones → archivos → materia
    sesiones = db.query(models.Sesion).filter(models.Sesion.materia_id == materia_id).all()
    for s in sesiones:
        db.query(models.Mensaje).filter(models.Mensaje.sesion_id == s.id).delete()
    db.query(models.Sesion).filter(models.Sesion.materia_id == materia_id).delete()
    db.query(models.Archivo).filter(models.Archivo.materia_id == materia_id).delete()
    db.query(models.Materia).filter(models.Materia.id == materia_id).delete()
    db.commit()
    db.close()
    return {"ok": True}

from search import buscar

@app.get("/buscar")
def buscar_archivos(q: str, materia_id: int = None):
    resultados = buscar(q, materia_id)
    return resultados

@app.post("/reindexar")
def reindexar_todo():
    from db.database import SessionLocal
    from db.models import Archivo
    from search import indexar_archivo
    db = SessionLocal()
    archivos = db.query(Archivo).filter(Archivo.extension == "pdf").all()
    resultados = []
    for a in archivos:
        try:
            indexar_archivo(a.id, a.materia_id, a.nombre, a.ruta)
            resultados.append({"archivo": a.nombre, "ok": True})
        except Exception as e:
            resultados.append({"archivo": a.nombre, "ok": False, "error": str(e)})
    db.close()
    return resultados
