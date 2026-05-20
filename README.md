# CanopyGuard — Setup

Satellite-based deforestation due-diligence dashboard for CPG supply chains. This README covers how to install and run the project.

## Prerequisites

| | Version | Check |
|---|---|---|
| Node.js | 20+ | `node --version` |
| npm | 10+ | `npm --version` |
| Git | any recent | `git --version` |

Install Node from [nodejs.org](https://nodejs.org) and Git from [git-scm.com](https://git-scm.com) if missing.

## Install

```bash
git clone https://github.com/pandaflop/canopyguard.git
cd canopyguard
npm install
```

Clone to a location **outside any cloud-synced folder** (OneDrive, Dropbox, iCloud, Google Drive). `node_modules` contains tens of thousands of small files that break cloud-sync clients. Recommended:

- Windows: `C:\dev\canopyguard`
- macOS / Linux: `~/code/canopyguard`

## Run

```bash
npm run build
npm run start
```

Open **http://localhost:3000**.

First page load takes a few seconds to compile; subsequent loads are instant. Stop the server with `Ctrl + C`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build into `.next/` |
| `npm start` | Run the production build |
| `npm run lint` | ESLint pass |
| `npm run fix:onedrive` | Windows-only OneDrive recovery (see Troubleshooting) |

## Troubleshooting

**`EINVAL` / `EBUSY` / `UNKNOWN` errors on `.next/` or `node_modules/`** — OneDrive is virtualizing files Next.js needs. Run `npm run fix:onedrive` then `npm run dev`. Permanent fix: move the project out of OneDrive.

**`MODULE_NOT_FOUND` for `next`** — handled automatically by `package.json` invoking `node ./node_modules/next/dist/bin/next` directly, so spaces in the project path don't break the npm shim.

**Port 3000 already in use** — `npm run dev -- --port 3010`.
