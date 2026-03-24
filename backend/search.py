import chromadb
import os
import sys
import fitz  # PyMuPDF
from google import genai
from google.genai import types
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

load_dotenv(os.path.join(base_dir, '.env'))

# Base de datos vectorial local
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "chroma")
chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = chroma_client.get_or_create_collection(
    name="archivos",
    metadata={"hnsw:space": "cosine"}
)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_embedding(texto: str) -> list[float]:
    result = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=texto
    )
    return result.embeddings[0].values

def chunk_texto(texto: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Divide texto en fragmentos con overlap para no perder contexto entre chunks."""
    palabras = texto.split()
    chunks = []
    i = 0
    while i < len(palabras):
        chunk = " ".join(palabras[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def indexar_archivo(archivo_id: int, materia_id: int, nombre: str, ruta: str):
    """Extrae texto de un PDF, lo chunkea y guarda embeddings en ChromaDB."""
    if not ruta.endswith(".pdf"):
        return

    doc = fitz.open(ruta)
    texto_completo = ""
    for pagina in doc:
        texto_completo += pagina.get_text()
    doc.close()

    if not texto_completo.strip():
        return

    chunks = chunk_texto(texto_completo)

    # Generamos embeddings para cada chunk
    ids = []
    embeddings = []
    documentos = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        if not chunk.strip():
            continue
        chunk_id = f"archivo_{archivo_id}_chunk_{i}"
        emb = get_embedding(chunk)
        ids.append(chunk_id)
        embeddings.append(emb)
        documentos.append(chunk)
        metadatas.append({
            "archivo_id": archivo_id,
            "materia_id": materia_id,
            "nombre": nombre,
            "chunk_index": i
        })

    if ids:
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documentos,
            metadatas=metadatas
        )

def desindexar_archivo(archivo_id: int):
    """Elimina todos los chunks de un archivo de ChromaDB."""
    resultados = collection.get(where={"archivo_id": archivo_id})
    if resultados["ids"]:
        collection.delete(ids=resultados["ids"])

def buscar(query: str, materia_id: int = None, n_resultados: int = 5) -> list[dict]:
    """Busca fragmentos similares a la query."""
    query_emb = get_embedding(query)

    where = {"materia_id": materia_id} if materia_id else None

    resultados = collection.query(
        query_embeddings=[query_emb],
        n_results=n_resultados,
        where=where,
        include=["documents", "metadatas", "distances"]
    )

    output = []
    if not resultados["ids"][0]:
        return output

    for i, doc_id in enumerate(resultados["ids"][0]):
        output.append({
            "archivo_id": resultados["metadatas"][0][i]["archivo_id"],
            "nombre": resultados["metadatas"][0][i]["nombre"],
            "chunk": resultados["documents"][0][i],
            "score": round(1 - resultados["distances"][0][i], 3)  # distancia coseno → similitud
        })

    return output