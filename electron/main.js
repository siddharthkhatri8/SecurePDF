const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the React/Vite build
  mainWindow.loadFile(
    path.join(__dirname, "../frontend/dist/index.html")
  );

  // 🔒 Block screenshots / screen recording
  mainWindow.setContentProtection(true);

  // Optional: open DevTools for debugging
  // mainWindow.webContents.openDevTools();
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

});

app.on("window-all-closed", () => {

  if (process.platform !== "darwin") {
    app.quit();
  }

});