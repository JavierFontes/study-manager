from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from db.database import Base
class Materia(Base):
    __tablename__ = "materias"
    id        = Column(Integer, primary_key=True, index=True)
    nombre    = Column(String(100), unique=True, nullable=False)
    color     = Column(String(7), default="#6366f1")   # color hex para la UI
    archivos  = relationship("Archivo", back_populates="materia")
    sesiones  = relationship("Sesion", back_populates="materia")

class Archivo(Base):
    __tablename__ = "archivos"
    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(255), nullable=False)
    ruta        = Column(String(500), nullable=False)
    tipo        = Column(String(20), nullable=False)   # "teorico" | "practico"
    extension   = Column(String(10))                   # "pdf", "png", etc.
    materia_id  = Column(Integer, ForeignKey("materias.id"))
    fecha_subida = Column(DateTime, default=datetime.utcnow)
    materia     = relationship("Materia", back_populates="archivos")

class Sesion(Base):
    __tablename__ = "sesiones"
    id          = Column(Integer, primary_key=True, index=True)
    materia_id  = Column(Integer, ForeignKey("materias.id"))
    agente      = Column(String(20), nullable=False)   # "teorico" | "practico"
    fecha       = Column(DateTime, default=datetime.utcnow)
    materia     = relationship("Materia", back_populates="sesiones")
    mensajes    = relationship("Mensaje", back_populates="sesion")

class Mensaje(Base):
    __tablename__ = "mensajes"
    id        = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones.id"))
    rol       = Column(String(20), nullable=False)     # "user" | "assistant"
    contenido = Column(Text, nullable=False)
    fecha     = Column(DateTime, default=datetime.utcnow)
    sesion    = relationship("Sesion", back_populates="mensajes")

class Nota(Base):
    __tablename__ = "notas"
    id         = Column(Integer, primary_key=True, index=True)
    archivo_id = Column(Integer, ForeignKey("archivos.id"))
    contenido  = Column(Text, nullable=False)
    fecha      = Column(DateTime, default=datetime.utcnow)
    archivo    = relationship("Archivo")