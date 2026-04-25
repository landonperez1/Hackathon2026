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
const SERVER_TIMEOUT_MS = 60_000;

let serverProcess = null;
let mainWindow = null;
let serverExitInfo = null;
const serverOutputBuffer = [];

const userDataDir = app.getPath("userData");
const envPath = path.join(userDataDir, ".env");
const dataDir = path.join(userDataDir, "data");
const logsDir = path.join(userDataDir, "logs");
const launcherLogPath = path.join(logsDir, "launcher.log");
const serverLogPath = path.join(logsDir, "server.log");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

function timestamp() {
  return new Date().toISOString();
}

function log(line) {
  const stamped = `[${timestamp()}] ${line}\n`;
  try {
    fs.appendFileSync(launcherLogPath, stamped);
  } catch {}
  try {
    process.stdout.write(stamped);
  } catch {}
}

try {
  if (
    fs.existsSync(launcherLogPath) &&
    fs.statSync(launcherLogPath).size > 256_000
  ) {
    fs.renameSync(launcherLogPath, launcherLogPath + ".old");
  }
  fs.writeFileSync(serverLogPath, "");
} catch {}

log(
  `launcher start: pid=${process.pid} packaged=${app.isPackaged} platform=${process.platform} arch=${process.arch} version=${app.getVersion()}`
);
log(`userData=${userDataDir}`);

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

function recordServerOutput(prefix, data) {
  const text = data.toString();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    const stamped = `[${timestamp()}] ${prefix} ${line}\n`;
    try {
      fs.appendFileSync(serverLogPath, stamped);
    } catch {}
    serverOutputBuffer.push(line);
    if (serverOutputBuffer.length > 200) serverOutputBuffer.shift();
    try {
      process.stdout.write(stamped);
    } catch {}
  }
}

function waitForServer(timeoutMs) {
  const start = Date.now();
  let attempts = 0;
  return new Promise((resolve, reject) => {
    const tick = () => {
      attempts++;
      if (serverExitInfo) {
        const tail = serverOutputBuffer.slice(-15).join("\n");
        return reject(
          new Error(
            `Server crashed before becoming ready (exit=${serverExitInfo.code}, signal=${serverExitInfo.signal}).\n\nLast output:\n${
              tail || "(no output)"
            }\n\nFull log: ${serverLogPath}`
          )
        );
      }
      const req = http.get(APP_URL, (res) => {
        res.resume();
        log(`server ready after ${attempts} attempts (${Date.now() - start}ms)`);
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          const tail = serverOutputBuffer.slice(-15).join("\n");
          reject(
            new Error(
              `Timed out after ${Math.round(
                timeoutMs / 1000
              )}s waiting for ${APP_URL}.\n\nLast output:\n${
                tail || "(no output captured — server probably never started)"
              }\n\nFull log: ${serverLogPath}`
            )
          );
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
    log("dev mode: waiting for next dev server");
    await waitForServer(SERVER_TIMEOUT_MS);
    return;
  }

  const standaloneDir = app.isPackaged
    ? path.join(process.resourcesPath, "app")
    : path.join(__dirname, "..", ".next", "standalone");
  const serverScript = path.join(standaloneDir, "server.js");

  log(`spawning server: script=${serverScript}`);
  log(`spawn cwd=${standaloneDir}`);
  log(`spawn execPath=${process.execPath}`);

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `server.js not found at ${serverScript}.\nReinstall ProjectMind.`
    );
  }

  // Pre-flight: confirm the SQLite WASM binary made it into the bundle.
  const wasmPath = path.join(
    standaloneDir,
    "node_modules",
    "node-sqlite3-wasm",
    "dist",
    "node-sqlite3-wasm.wasm"
  );
  if (!fs.existsSync(wasmPath)) {
    throw new Error(
      `Required SQLite WASM file is missing: ${wasmPath}\nReinstall ProjectMind.`
    );
  }
  log(`wasm ok: ${wasmPath}`);

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      ANTHROPIC_API_KEY: apiKey,
      PROJECTMIND_DATA_DIR: dataDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  log(`server pid=${serverProcess.pid}`);

  serverProcess.stdout.on("data", (d) => recordServerOutput("[stdout]", d));
  serverProcess.stderr.on("data", (d) => recordServerOutput("[stderr]", d));

  serverProcess.on("error", (err) => {
    log(`server spawn error: ${err.message}`);
  });

  serverProcess.on("exit", (code, signal) => {
    serverExitInfo = { code, signal };
    log(`server process exited: code=${code} signal=${signal}`);
    serverProcess = null;
    if (mainWindow && !mainWindow.isDestroyed() && code !== 0) {
      dialog.showErrorBox(
        "ProjectMind server stopped",
        `Exit code: ${code}.\n\nLog: ${serverLogPath}`
      );
    }
  });

  await waitForServer(SERVER_TIMEOUT_MS);
}

function showStartupError(err) {
  const message = String(err && err.message ? err.message : err);
  log(`startup failed: ${message}`);
  const choice = dialog.showMessageBoxSync({
    type: "error",
    title: "ProjectMind failed to start",
    message: "ProjectMind couldn't start its embedded server.",
    detail: message,
    buttons: ["Open log folder", "Quit"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (choice === 0) {
    shell.openPath(logsDir);
  }
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
        {
          label: "Open log folder",
          click: () => shell.openPath(logsDir),
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
    showStartupError(err);
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
