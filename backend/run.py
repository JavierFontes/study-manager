import uvicorn
import sys
import os

if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(sys.executable)
    os.chdir(base_dir)

# Importar app directamente en lugar de como string
from main import app

if __name__ == '__main__':
    uvicorn.run(app, host="127.0.0.1", port=8000)