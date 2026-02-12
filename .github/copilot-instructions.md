<!-- Generated guidance for AI coding agents working on this repository -->
# Copilot / AI agent instructions

Purpose
- Provide concise, actionable guidance for editing, running, and extending this Expo/React Native app.

Big picture
- This is an Expo app using `expo-router` with the app directory as the routing entrypoint (`app/`).
- `package.json` main is `expo-router/entry` and key scripts: `start`, `android`, `ios`, `web`, `reset-project`.
- UI uses small themed primitives in `components/` (e.g. `themed-text.tsx`, `themed-view.tsx`) and lightweight hooks in `hooks/` to surface color and theme logic.

Key files & folders (examples)
- `app/_layout.tsx` — global layout, navigation and providers.
- `app/index.tsx` — app entry screen.
- `components/` — reusable UI primitives (refer to `themed-*` components when adding UI).
- `hooks/` — `use-theme-color.ts`, `use-color-scheme.ts` — prefer these for theme-aware styling.
- `scripts/reset-project.js` — included helper script; review before running.

Build / run / debug
- Local dev: `npm run start` (runs `expo start`).
- Platform targets: `npm run ios`, `npm run android`, `npm run web`.
- Lint: `npm run lint` (uses `expo lint`).

Conventions & patterns to follow
- Routing: add screens under `app/` following file-based routing conventions used by `expo-router`.
- Theming: prefer `themed-text.tsx` / `themed-view.tsx` and `use-theme-color.ts` instead of ad-hoc color values.
- Small focused components: prefer small files in `components/` and `components/ui/` for shared UI.
- Avoid adding global styles; prefer theme-aware components and local styles within screens.

Integration points
- Native / Expo APIs are used via `expo-*` packages (see `package.json` dependencies). For native issues, reference Expo SDK ~54 compatibility.
- Router: navigation is driven by file system under `app/` (see `app/_layout.tsx`).

What I (the agent) will do when asked
- Inspect `app/` for routing changes, `components/` for UI additions, and `hooks/` for new theme behavior.
- When modifying visual components, reuse `themed-*` primitives and add small unit-like checks (manual preview via `expo start`).

Notes
- There are no existing agent docs in the repo; create or update this file when conventions change.
- If a change touches native behavior, mention Expo SDK and `react-native` versions from `package.json`.

Please review and tell me which areas need more examples or stricter rules.
