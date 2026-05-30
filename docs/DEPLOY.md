# Deploying from-tokens-to-tools

The app itself is tiny. The recorded token data (the default experience) is bundled
JSON — it works on any host, on any device, in any region, with no extra infra. The
only thing that needs special handling is the **opt-in live model** (~178 MB of
weights), which is deferred (see below).

CI (`.github/workflows/ci.yml`) runs `test` + `build` + v2-data `validate` on every
push to `main`. There is intentionally **no auto-deploy job yet** — pick a host below
and add one when ready.

## Host options

| | base path | notes |
|---|---|---|
| **GitHub Pages** (project site) | `'/from-tokens-to-tools/'` | Free, repo-integrated. Set `base` in `vite.config.ts`. Cannot host the 174 MB weights file (GitHub's 100 MB/file hard limit) — keep live deferred or host weights externally. |
| **Vercel** | `'/'` (default, no change) | Free, custom domain easy. Can serve larger static assets. |

`vite.config.ts` currently has no `base`, i.e. `'/'` — correct for Vercel / a custom
domain at the root. For a GitHub Pages **project** site, set:

```ts
// vite.config.ts
export default defineConfig({ base: '/from-tokens-to-tools/', /* … */ });
```

## The live model (~178 MB) — deferred

The deepest zoom level offers an optional "load live model" button that runs
**SmolLM2-135M** in the browser via transformers.js + WebGPU. The weights are served
**same-origin** from `/models` (see `src/microscope/live.ts`,
`env.localModelPath = '/models'`), populated locally by `npm run prefetch:model`
(writes `public/models/…`, gitignored).

**Status: deferred for the web build.** On the deployed site `/models` is not served,
so clicking the button fails *gracefully* — `useMicroscope` catches it and stays on the
recorded data (the UI shows "live model failed to load; using recorded data"). The
recorded path is the full teaching experience; live resampling is a bonus.

### To enable live on the deployed site later

The 174 MB `onnx/model_q4.onnx` exceeds GitHub's 100 MB/file limit, so it can't be
committed. Two no-paid-infra-to-low-infra paths:

1. **GitHub Release + jsDelivr** — upload `public/models/HuggingFaceTB/SmolLM2-135M-Instruct/**`
   as assets on a GitHub Release; point transformers.js at the jsDelivr release URL
   (permissive CORS). Change `LiveMicroscope.create` to set
   `env.localModelPath = 'https://cdn.jsdelivr.net/gh/<owner>/<repo>@<tag>/models'`
   (and `env.allowRemoteModels = true`).
2. **External bucket / CDN** (e.g. Cloudflare R2) with permissive CORS — same idea,
   point `localModelPath` at the bucket URL. Most robust for CN audiences.

(Optional polish: gate the live button behind a `VITE_LIVE_MODEL` env flag so it only
shows where weights are actually served, avoiding a button that fails on the
recorded-only build.)

## Local production preview

```bash
npm run build
npm run prefetch:model   # only needed to exercise the live button locally
npm run preview
```
