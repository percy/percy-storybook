# Percy Storybook Addon Implementation Prompt

You are an expert JavaScript/Node.js engineer working on the `@percy/storybook` SDK located at `/Users/pradumkumar/percyApps/percy-storybook`.

**Goal:** Extend `@percy/storybook` so it works as both a CLI SDK (current behaviour) AND a Storybook addon — without breaking anything. Take inspiration from the reference implementation in `percy-storybook-addon/`.

---

## Context: What exists today

**SDK (`src/`)** — ESM (`"type": "module"`), CLI-based:
- `src/index.js` exports `storybook` and `start`
- `src/snapshots.js` contains `takeStorybookSnapshots` (the core snapshot generator)
- `src/storybook.js` / `src/start.js` are CLI entry points
- Built to `dist/` via Babel. Registered in Percy CLI via `@percy/cli.commands`
- `package.json` `exports` field only exposes `./dist/index.js`

**Reference addon (`percy-storybook-addon/`)** — a separate directory showing what needs to be built:
- `preset.js` — CommonJS, registers `managerEntries` and `experimental_serverChannel` with Storybook
- `manager.js` — ESM, registers the panel and sidebar customisation in Storybook's browser UI
- `src/constants.js` + `src/constants.cjs` — event names, storage keys, snapshot types
- `src/components/` — React components: `PercyPanel.jsx`, `SnapshotButtons.jsx`, `TokenInput.jsx`, `SidebarTitle.jsx`, `StoryStatusBadge.jsx`
- `src/server/percyRunner.js` — CommonJS, Node.js; drives `@percy/core` + `takeStorybookSnapshots`, intercepts `@percy/logger` streams, streams logs back via callbacks
- `src/utils/percyClient.js` — browser-side HTTP fallback client (talks to Express server on port 3737)
- `src/utils/storybookApi.js` — browser helpers: `getCurrentStory`, `buildCurrentStoryPattern`, `buildCurrentTreePattern`, `getStorybookBaseUrl`
- `server.js` — standalone Express server (fallback only, not primary flow)

---

## Architecture to implement

### Three layers:

**1. Preset (Node.js)** — `preset.cjs` at the SDK root
- Export `managerEntries` pointing to `./manager.js`
- Export `experimental_serverChannel` which listens for `RUN_SNAPSHOT` / `STOP_SNAPSHOT` channel events, dynamically requires `percyRunner`, runs snapshots, emits `SNAPSHOT_STARTED` / `SNAPSHOT_PROGRESS` / `SNAPSHOT_SUCCESS` / `SNAPSHOT_ERROR` / `LOG` back to the browser
- Must be `.cjs` because Storybook's preset loader uses `require()`

**2. Manager (browser ESM)** — `manager.js` at the SDK root
- Register a Storybook panel rendering `PercyPanel`
- Override `sidebar.renderLabel` to render `SidebarTitle` with per-story status badges
- Use `addons.register` / `addons.add` / `addons.setConfig` from `@storybook/manager-api`

**3. Percy Runner (Node.js)** — `src/percyRunner.js`
- Intercept `@percy/logger` stdout/stderr streams before Percy initialises
- Poll logger message store every 1s as backup
- Dynamically import `@percy/core` and `@percy/storybook` (ESM dynamic `import()`)
- Instantiate `Percy`, call `takeStorybookSnapshots`, drive via `runAsyncGenerator`
- Always call `percy.stop()` in `finally`
- Export `takePercySnapshots({ url, include, exclude, widths, percyToken, onProgress, onLog })`

---

## Channel events (copy from `src/constants.js`)

All prefixed with `percy-storybook/`:

| Event | Direction | Purpose |
|---|---|---|
| `run-snapshot` | UI → Server | payload `{ url, include, exclude, widths, percyToken }` |
| `stop-snapshot` | UI → Server | Abort running snapshot |
| `snapshot-started` | Server → UI | Snapshot kicking off |
| `snapshot-progress` | Server → UI | Progress messages |
| `snapshot-success` | Server → UI | Build URL on success |
| `snapshot-error` | Server → UI | Error message |
| `snapshot-stopped` | Server → UI | Aborted confirmation |
| `log` | Server → UI | Streamed Percy log lines |

---

## UI Components (copy + adapt from `percy-storybook-addon/src/components/`)

- **`PercyPanel.jsx`** — token input, 3 snapshot buttons, status section with progress bar, log viewer (last 200 lines, auto-scroll), story info box. Uses `useChannel` + `useStorybookApi` from `@storybook/manager-api`.
- **`SnapshotButtons.jsx`** — Full / Current Story / Current Tree buttons
- **`TokenInput.jsx`** — token input persisted to `localStorage` under key `percy_token`
- **`SidebarTitle.jsx`** — renders story name + coloured status badge (passed/failed/pending/approved) pulled from `window.__PERCY_STORY_STATUSES__`
- **`StoryStatusBadge.jsx`** — diff percentage badge

---

## `package.json` changes needed

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./preset": "./preset.cjs",
    "./manager": "./manager.js",
    "./package.json": "./package.json"
  },
  "storybook": {
    "displayName": "Percy",
    "icon": "https://avatars.githubusercontent.com/u/12260884",
    "preset": "./preset.cjs"
  },
  "peerDependencies": {
    "@storybook/components": ">=7.x",
    "@storybook/manager-api": ">=7.x",
    "@storybook/theming": ">=7.x",
    "react": "^18.x || ^19.x",
    "react-dom": "^18.x || ^19.x"
  }
}
```

---

## Key constraints

- **Do not break the CLI.** `src/index.js`, `src/storybook.js`, `src/start.js`, and `dist/` must remain unchanged in behaviour.
- **CJS/ESM boundary:** `preset.cjs` must use `require()` / `module.exports`. The runner uses `import()` dynamically for ESM modules. `manager.js` must be ESM.
- **No React in Node.js files.** Components stay in browser-only files (`manager.js` and `src/components/`).
- **The `experimental_serverChannel`** runs in Storybook Dev Server's Node.js process — it has full access to `process.env`, the filesystem, and can `require()` Node modules.
- **Babel build:** Components (`.jsx`) need to be compiled. Add them to the build or handle them separately (e.g. pre-built or bundled by Storybook's own webpack/vite).
- **`server.js` is optional** — implement it last as a fallback for non-dev-server environments.

---

## Implementation order

1. Add `src/constants.js` and `src/constants.cjs`
2. Add `src/percyRunner.js` (Node.js runner)
3. Add `src/utils/storybookApi.js` and `src/utils/percyClient.js`
4. Add UI components under `src/components/`
5. Add `manager.js` at SDK root
6. Add `preset.cjs` at SDK root
7. Update `package.json` exports, `storybook` metadata, and peer deps
8. Verify the CLI still works (`percy storybook`)
9. Verify Storybook auto-discovers the preset when `@percy/storybook` is installed
