<div align="center">
  <img src="https://pbs.twimg.com/profile_banners/1932708558791192578/1769731339/1500x500" alt="Axis Logo" width="1000" />
  <h1>Axis Protocol</h1>
  <p>
    <strong>First onchain index Funds</strong>
  </p>
</div>


**Axis** is a decentralized protocol for creating, managing, and investing in on-chain index funds (ETFs) on Solana.
This repository hosts the ecosystem's codebase, primarily focusing on the **frontend interface (`axis-agent`)** where users can build and deploy their asset strategies.

## 📂 Repository Structure

- **`axis-agent`** (Main): The web dashboard built with React & Vite. This is the primary interface for users to connect wallets, build strategies, and manage ETFs.
- **`axis-api`**: The backend service powering data indexing and off-chain logic, running on **Cloudflare Workers**.
- **`axis-mobile`**: Repository for the future **Android application** (React Native / Expo).
- **`kagemusha-program`**: The underlying Solana smart contracts (Anchor).

## ✨ Key Features (Frontend)

- **Strategy Builder**: A visual interface to construct weighted baskets of assets (SPL Tokens, Stocks, Prediction Markets).
- **One-Click Deployment**: Interact directly with Solana to mint ETF tokens.
- **Dashboard**: Real-time tracking of portfolio performance, TVL, and asset allocation.
- **Discovery**: Browse and invest in top-performing strategies.

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Cloudflare Workers, TypeScript
- **Mobile**: React Native, Expo (Future Android App)
- **Blockchain**: Solana Web3.js, Anchor Framework
- **Tools**: pnpm, Prettier, ESLint

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### Installation & Running

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd axis-mvp
   pnpm install

2. **Run the Frontend (`axis-agent`)**
The frontend is the main entry point for development.
```bash
cd axis-agent
pnpm dev

```


Access the dashboard at [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173).
3. **(Optional) Run the Backend (`axis-api`)**
Emulate the Cloudflare Workers environment locally.
```bash
cd axis-api
pnpm dev

```



## 🧹 Code Quality

This project uses **Prettier** and **ESLint** to maintain code quality.

* **Format Code**:
Prettier is configured. Run the following command in the `axis-agent` directory to format your code:
```bash
pnpm format

```


* **Lint Code**:
```bash
pnpm lint

```



---

*Built with ❤️ on Solana.*
