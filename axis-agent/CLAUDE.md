# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**axis-agent** is a Solana DeFi frontend (MVP) for "Kagemusha AI Strategy Factory" — a platform where users discover, create, and manage automated token trading strategies on Solana. Built with React 19, TypeScript, and Vite; deployed to Cloudflare Pages.

## Commands

```bash
pnpm dev          # Start Vite dev server with HMR
pnpm build        # TypeScript check (tsc -b) + Vite production build
pnpm lint         # ESLint across all TS/TSX files
pnpm preview      # Preview production build locally
pnpm deploy       # Build + deploy to Cloudflare Pages via Wrangler
```

No test framework is configured. Build validation relies on `tsc -b` and `eslint .`.

## Architecture

### Single Page Application

The app is a single-route SPA. `Home.tsx` acts as the main orchestrator, switching between four internal views: **DISCOVER** (browse strategies), **CREATE** (build strategies), **PROFILE** (user management), and **STRATEGY_DETAIL**.

### Data Flow

```
React Components
  → Zustand store (useTacticalStore) for strategy creation workflow state
  → ToastContext for notifications
  → Custom hooks (useWallet, useConnection)
  → Services layer (fetch-based API clients)
  → External APIs + Solana blockchain
```

### Services Layer (`src/services/`)

- **api.ts** — Backend REST client (user management, strategy CRUD, token operations, deployment). Base URL: `https://axis-api.yusukekikuta-05.workers.dev` (override via `VITE_API_URL`).
- **kagemusha.ts** — On-chain program interaction via Anchor. Program ID: `2kdDnjHHLmHex8v5pk8XgB7ddFeiuBW4Yp5Ykx8JmBLd`. Handles strategy initialization, SOL deposits/withdrawals, and account queries using PDAs.
- **jupiter.ts** — Jupiter Lite API v2 for token search/prices. Implements memory + localStorage caching (6h TTL) with a hardcoded fallback list for major tokens.
- **coingecko.ts** — Market data with batched price fetching and 5-minute cache.
- **dexscreener.ts / geckoterminal.ts** — Additional market data sources.

### State Management

- **Zustand** (`useTacticalStore`): Manages the multi-step strategy creation flow (DIRECTIVE → MATRIX → SIMULATION → ASSEMBLY → DEPLOYMENT) including token allocations and generated tactics.
- **Core types** in `src/types/index.ts`: `Strategy`, `TokenInfo`, `TokenAllocation`, `Vault`, `CreateStep`.
- **Solana wallet state**: Via `@solana/wallet-adapter-react` context. Network is **Devnet**.

### Component Organization

- `src/components/create/` — 23 components for strategy creation wizard
- `src/components/discover/` — Strategy browsing (swipe and list views)
- `src/components/common/` — Shared UI (Toast, PriceChart, ProfileDrawer, etc.)
- `src/components/profile/` — User profile

### Styling

Tailwind CSS 4 with a custom theme: Times New Roman serif font, bronze/gold accents (`#D97706`, `#F59E0B`), deep black backgrounds (`#0C0A09`). A `.glass` class provides frosted glassmorphism effects. Mobile overrides in `src/mobile-styles.css`.

### Key Libraries

- **UI**: Framer Motion (animations), Radix UI + Headless UI (accessible components), Lucide React (icons), Recharts + Lightweight Charts (data viz)
- **Solana**: `@solana/web3.js`, `@coral-xyz/anchor` 0.29, `@solana/spl-token`, wallet adapter
- **Utilities**: clsx + tailwind-merge for class names, html2canvas for screenshots

## Environment Variables

- `VITE_JUPITER_API_KEY` — Jupiter API key
- `VITE_PRIVY_APP_ID` — Privy auth app ID (currently commented out in App.tsx)
- `VITE_API_URL` — Optional backend API base URL override

## Deployment

Cloudflare Pages via Wrangler. Config in `wrangler.jsonc`. Output directory: `dist/`. Node.js compatibility flag enabled.
