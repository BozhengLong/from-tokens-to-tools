# from tokens to tools

> Why does a thing that only predicts the next *token* end up controlling your computer?

An interactive, scrollable explainer that walks from **"the model is just a probability machine"** all the way to **"this probability machine is running real tools on a real runtime"** — in seven stations, using **real recorded model behavior** (not hand-waved mock-ups).

The thesis: there is no magic step. Each station adds exactly **one convention** — tokenization, softmax, sampling, a JSON schema, an execution runtime, a loop — and stacking those conventions is the entire gap between "next-token prediction" and "an agent that does things."

**Status:** 🚧 Work in progress. The recording pipeline + data (the "backstage") is complete; the visual front-end is being built next.

---

## The seven stations

| # | Station | The convention it reveals |
|---|---------|---------------------------|
| 1 | **Tokenization** | text ↔ token ids (the model never sees characters) |
| 2 | **Logprobs** | one forward pass → a probability distribution over the vocab |
| 3 | **Sampling** | how a single token is drawn (greedy / temperature / top-p) — interactive |
| 4 | **Function call** | a token sequence, shaped by a JSON schema, *becomes* a structured command |
| 5 | **Tool execution** | the runtime — *not the model* — runs the command and returns an observation |
| 6 | **Agent loop** | Thought → Action → Observation, until the model says stop |
| 7 | **Reactive vs Deliberative** | two agent topologies for the same task, side by side |

Four switchable examples carry the narrative end-to-end, in **English and 中文**:

- **downloads-bigfiles** — list files over 1 GB (in-browser sandbox FS)
- **shanghai-weather** — check the forecast, send a notification (open-meteo)
- **wikipedia-tweet** — read an article, draft a tweet (Wikipedia API)
- **hn-weekend-pick** — pick a weekend read from Hacker News (HN API)

---

## What "real" means here

This project's non-negotiable rule: **model output is 100% real.** Reasoning, logprobs, tool calls, and sampling paths all come from actual API runs — recorded once, replayed deterministically in the browser. Tools are **real code** executing against a real sandbox or live public APIs. Nothing is faked; where data is illustrative or truncated, the UI says so. The full integrity contract is in [`docs/recording-notes.md`](docs/recording-notes.md).

- **Recording time** (one-off, costs API budget): reads `OPENAI_API_KEY` + `OPENAI_BASE_URL` from `.env`.
- **Runtime** (the demo itself): **zero API keys** — every recording lives in the repo as JSON.

---

## Tech stack

Vite · React · TypeScript · Tailwind (v4) · Zustand · Zod · Framer Motion · vitest · tiktoken · OpenAI SDK

## Develop

```bash
npm install
npm run dev        # start the dev server
npm test           # run the unit tests
npm run build      # type-check + production build
```

## Re-recording the data (optional, advanced)

Only needed if you want to regenerate the example datasets. Requires an OpenAI-compatible endpoint that returns logprobs.

```bash
cp .env.example .env          # fill in OPENAI_API_KEY + OPENAI_BASE_URL
npm run record                # all examples × both languages
# or a single example:
npm run record -- --example downloads-bigfiles --lang zh
npx tsx scripts/record/validate.ts   # validate outputs against the Zod schemas
```

See [`docs/recording-notes.md`](docs/recording-notes.md) for the recording model, integrity rules, and recovery tips.

## Project docs

- Design spec — [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Implementation plans — [`docs/superpowers/plans/`](docs/superpowers/plans/)
- Recording notes — [`docs/recording-notes.md`](docs/recording-notes.md)
