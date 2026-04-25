# ProjectMind

AI-powered project management that learns your professional network.

Describe a project, and ProjectMind generates three ranked strategies — who to involve, in what order, how long it'll take, what could go wrong, and how to talk to each person — based on what it knows about your team.

## Features

- **Network graph.** Each teammate is a node; size reflects current workload, color reflects reliability (green/yellow/red), and edges show who works with whom. Projects and files appear as additional nodes — `@`-mention them in interactions and the mind-map starts wiring itself together.
- **People profiles.** Capture name, role, reliability (1-5), workload (1-5), communication style, and personality notes.
- **Projects + files.** Separate page for project folders with file uploads (blueprints, permits, etc.) and per-file notes.
- **Interaction log with @mentions.** Type `@` while logging an interaction to link people, projects, or files.
- **AI strategy generation.** Claude Opus 4.7 with adaptive thinking proposes 3 distinct strategies per project, grounded in your actual network.
- **Feedback loop.** Rate completed strategies; future recommendations learn from what worked and what didn't.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- SQLite via `node-sqlite3-wasm` (pure WebAssembly — no native compilation, runs on x64 and arm64)
- Anthropic SDK (`@anthropic-ai/sdk`) with adaptive thinking, prompt caching, and structured outputs via `zodOutputFormat`
- `react-force-graph-2d` for the network visualization
- Electron + electron-builder for desktop packaging

## Quick start (web dev mode)

```bash
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
npm run dev   # http://localhost:3000
```

## Desktop app (Windows .exe)

ProjectMind ships as a desktop app via Electron. The launcher boots the embedded Next.js server, prompts you for your Anthropic API key on first run, and stores the SQLite DB + uploaded files in your user-data folder.

### Run locally (dev)

```bash
# In one shell:
npm run electron:dev
```

This runs `next dev` and Electron together. The Electron window opens automatically once the dev server is ready.

### Run a production-mode launch (no installer)

```bash
npm run electron:start
```

Builds the standalone Next bundle and runs it inside Electron from the local checkout.

### Build Windows installers (x64 + arm64)

```bash
npm run package:win
```

Produces signed-or-unsigned installers in `dist/`:

- `ProjectMind-<version>-x64.exe` — NSIS installer for Intel/AMD Windows
- `ProjectMind-<version>-arm64.exe` — NSIS installer for **ARM64 Windows** (Surface Pro X, Snapdragon laptops, etc.)
- Also `portable` variants of both — single-file exes that don't need installation

> **Cross-building from Linux/macOS:** electron-builder can produce `x64` Windows builds with Wine installed, but **arm64 Windows builds must be produced on Windows.** The included GitHub Actions workflow handles this — see below.

### Auto-build on every push (recommended)

`.github/workflows/build-windows.yml` builds both x64 and arm64 Windows installers on a `windows-latest` runner for every push to `main`, every PR, and every tag. The artifacts are uploaded to the workflow run; tagging `v*` (e.g., `git tag v0.1.0 && git push --tags`) attaches them to a GitHub Release.

To grab a build:

1. Push your commit.
2. Open the Actions tab on GitHub → `Build Windows installers` → latest run → download the `ProjectMind-Windows` artifact.

### How the desktop app stores data

- The SQLite DB and uploaded project files live in your user-data folder, not the install folder. On Windows that's `%APPDATA%/ProjectMind/data/`. The app survives upgrades/uninstalls without losing data.
- The Anthropic API key is saved at `%APPDATA%/ProjectMind/.env`.
- Use the **ProjectMind → Set Anthropic API key…** menu to update it.
- Use **ProjectMind → Open data folder** to inspect the database/files.

## Using it

1. Click **+ Add** in the left sidebar to add teammates. The more context you give (communication style, personality), the sharper the strategies.
2. Draw working relationships by selecting a person and toggling the "Works with" chips in the detail panel.
3. In the **Projects** tab (top-right button), create project folders and upload blueprints, permits, etc. Each file can carry notes.
4. Back on the **Network** page, switch to the **Interactions** tab. As you log what happened, type `@` to link people, projects, or files. Co-mentioned entities show up connected on the mind-map.
5. Switch to the **Strategy** tab, describe a task or project, and click **Generate 3 strategies**. Claude will propose three ranked approaches.
6. After you finish a project, click **I went with this one** on the option you used and rate how it went. ProjectMind feeds that back into the next round.

## Notes

- Strategy generation uses `claude-opus-4-7` with `thinking: { type: "adaptive" }` and `effort: "high"`. Expect 10-30 seconds per request.
- The system prompt is cached (`cache_control: ephemeral`); repeated requests reuse the cache as long as the system prompt hasn't changed.
- The user's full network plus a co-mention summary is passed as context. If your network grows large, consider moving it behind a tool call.
