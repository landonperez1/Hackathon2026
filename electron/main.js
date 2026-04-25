// ProjectMind Electron launcher.
// Spawns the Next.js standalone server in-process and opens a window pointing at it.

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const PORT = process.env.PROJECTMIND_PORT
  ? Number(process.env.PROJECTMIND_PORT)
  : 3737;
const APP_URL = `http://127.0.0.1:${PORT}`;
const IS_DEV = process.env.ELECTRON_DEV === "1";

let serverProcess = null;
let mainWindow = null;

const userDataDir = app.getPath("userData");
const envPath = path.join(userDataDir, ".env");
const dataDir = path.join(userDataDir, "data");

// Ensure user data dir for SQLite + uploaded files lives in a writable place
// outside the read-only packaged resources.
fs.mkdirSync(dataDir, { recursive: true });

function readEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, "utf-8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeEnvFile(env) {
  const body =
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";
  fs.writeFileSync(envPath, body, { mode: 0o600 });
}

function promptForApiKey() {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 520,
      height: 320,
      title: "ProjectMind setup",
      autoHideMenuBar: true,
      resizable: false,
      backgroundColor: "#0a0a0f",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, "prompt-preload.js"),
      },
    });

    let submitted = null;
    const handler = (_event, value) => {
      submitted = value;
      win.close();
    };
    ipcMain.once("api-key-submitted", handler);

    win.on("closed", () => {
      ipcMain.removeListener("api-key-submitted", handler);
      resolve(submitted);
    });

    win.loadFile(path.join(__dirname, "prompt.html"));
  });
}

async function ensureApiKey() {
  const fromEnv = process.env.ANTHROPIC_API_KEY;
  if (fromEnv) return fromEnv;

  const env = readEnvFile();
  if (env.ANTHROPIC_API_KEY) return env.ANTHROPIC_API_KEY;

  const key = await promptForApiKey();
  if (!key) return null;
  writeEnvFile({ ...env, ANTHROPIC_API_KEY: key });
  return key;
}

function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(APP_URL, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Timed out waiting for ProjectMind server"));
        } else {
          setTimeout(tick, 250);
        }
      });
    };
    tick();
  });
}

async function startServer(apiKey) {
  if (IS_DEV) {
    // In dev mode the developer runs `next dev` separately; just wait for it.
    await waitForServer(60000);
    return;
  }

  // In packaged builds the standalone bundle lives in resources/app.
  // Outside packaging (running `electron .` after `next build`) it's at .next/standalone.
  const standaloneDir = app.isPackaged
    ? path.join(process.resourcesPath, "app")
    : path.join(__dirname, "..", ".next", "standalone");
  const serverScript = path.join(standaloneDir, "server.js");

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `Could not find Next.js standalone server at ${serverScript}. Run \`npm run build\` first.`
    );
  }

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      ANTHROPIC_API_KEY: apiKey,
      // Persist SQLite DB and uploaded files in the user-data directory so they
      // survive app updates and live in a writable location.
      PROJECTMIND_DATA_DIR: dataDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (d) =>
    process.stdout.write(`[server] ${d}`)
  );
  serverProcess.stderr.on("data", (d) =>
    process.stderr.write(`[server] ${d}`)
  );

  serverProcess.on("exit", (code) => {
    serverProcess = null;
    if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showErrorBox(
        "ProjectMind server stopped",
        `The embedded server exited with code ${code}.`
      );
    }
  });

  await waitForServer();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: "ProjectMind",
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0f",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(APP_URL);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: "ProjectMind",
      submenu: [
        {
          label: "Set Anthropic API key…",
          click: async () => {
            const key = await promptForApiKey();
            if (!key) return;
            const env = readEnvFile();
            writeEnvFile({ ...env, ANTHROPIC_API_KEY: key });
            dialog.showMessageBox(mainWindow, {
              type: "info",
              message: "API key saved. Restart ProjectMind to apply.",
            });
          },
        },
        {
          label: "Open data folder",
          click: () => shell.openPath(dataDir),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  buildMenu();

  const apiKey = await ensureApiKey();
  if (!apiKey) {
    app.quit();
    return;
  }

  try {
    await startServer(apiKey);
    createWindow();
  } catch (err) {
    dialog.showErrorBox("ProjectMind failed to start", String(err));
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && !IS_DEV) {
    createWindow();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
    serverProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
