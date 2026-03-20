const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = !app.isPackaged
let backendProcess = null
let mainWindow = null

function startBackend() {
  if (!app.isPackaged) return

  const backendExe = path.join(process.resourcesPath, 'backend', 'studyos-backend.exe')
  
  console.log('Iniciando backend desde:', backendExe)
  console.log('Existe:', require('fs').existsSync(backendExe))

  backendProcess = spawn(backendExe, [], {
    cwd: path.join(process.resourcesPath, 'backend'),
    env: { ...process.env },
    windowsHide: false  // mostrar ventana temporalmente para ver errores
  })

  backendProcess.on('error', (err) => {
    console.error('Error iniciando backend:', err)
  })

  backendProcess.on('exit', (code) => {
    console.error('Backend cerró con código:', code)
  })

  backendProcess.stdout.on('data', d => console.log(`[backend] ${d}`))
  backendProcess.stderr.on('data', d => console.error(`[backend] ${d}`))
}

function waitForBackend(retries = 40) {  // de 20 a 40 intentos
  return new Promise((resolve) => {
    const check = () => {
      fetch('http://localhost:8000/')
        .then(() => resolve())
        .catch(() => {
          if (retries-- > 0) setTimeout(check, 1000)  // de 500ms a 1000ms
          else resolve()
        })
    }
    setTimeout(check, 3000)  // esperar 3 segundos antes del primer intento
  })
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1117',
      symbolColor: '#ffffff',
      height: 32
    },
    backgroundColor: '#0f1117',
    show: false,
    icon: path.join(__dirname, 'public', 'hat.ico')
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (app.isPackaged) {
    await waitForBackend()
    const indexPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html')
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Error cargando:', err)
    })
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }
}

app.whenReady().then(() => {
  startBackend()
  createWindow()
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})