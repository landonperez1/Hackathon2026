# ProjectMind

AI-powered project management that learns your professional network.

Describe a project, and ProjectMind generates three ranked strategies — who to involve, in what order, how long it'll take, what could go wrong, and how to talk to each person — based on what it knows about your team.

## Features

- **Network graph.** Each teammate is a node; size reflects current workload, color reflects reliability (green/yellow/red), and edges show who works with whom.
- **People profiles.** Capture name, role, reliability (1-5), workload (1-5), communication style, and personality notes.
- **Interaction log.** Jot down what happened in meetings and conversations in plain language. ProjectMind reads these as context.
- **AI strategy generation.** Claude Opus 4.7 with adaptive thinking proposes 3 distinct strategies per project, grounded in your actual network.
- **Feedback loop.** Rate completed strategies; future recommendations learn from what worked and what didn't.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- SQLite via `better-sqlite3` (file stored in `./data/projectmind.db`)
- Anthropic SDK (`@anthropic-ai/sdk`) with adaptive thinking, prompt caching, and structured outputs via `zodOutputFormat`
- `react-force-graph-2d` for the network visualization

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Provide your Anthropic API key. Create `.env.local` in the project root:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

   The app is available at http://localhost:3000.

4. Production build:
   ```bash
   npm run build
   npm start
   ```

## Using it

1. Click **+ Add** in the left sidebar to add teammates. The more context you give (communication style, personality), the sharper the strategies.
2. Draw working relationships by selecting a person and toggling the "Works with" chips in the detail panel.
3. In the **Interactions** tab, log what happened in meetings and conversations. Attach a person and an optional project context.
4. Switch to the **Strategy** tab, describe a task or project, and click **Generate 3 strategies**. Claude will propose three ranked approaches.
5. After you finish a project, click **I went with this one** on the option you used and rate how it went. ProjectMind feeds that back into the next round.

## Data

All data lives locally in `./data/projectmind.db` (SQLite, WAL mode). Delete the file to reset.

## Notes

- Strategy generation uses `claude-opus-4-7` with `thinking: { type: "adaptive" }` and `effort: "high"` for quality. Expect 10-30 seconds per request.
- The system prompt is cached (`cache_control: ephemeral`), so repeated requests reuse the cache as long as the system prompt hasn't changed.
- The user's full network is passed as context on every request. If your network grows large, consider moving it behind a tool call.
