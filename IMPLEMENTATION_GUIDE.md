# Implementation Guide - Privy Integration & New Features

## Overview
This PR implements major updates to the Axis Protocol frontend:
1. **Privy Authentication Integration** - Replaces Solana Wallet Adapter + Google OAuth
2. **Invite Code System** - 10 codes per user registration
3. **Curator Studio** - Professional backtesting interface
4. **Redesigned Vault Detail Page** - Based on UI mockup
5. **Vault Creation Split** - Simple (user) vs Professional (curator) modes

---

## 🔐 1. Privy Integration

### Installation
```bash
cd axis-mock
npm install @privy-io/react-auth @privy-io/wagmi viem wagmi
```

### Configuration
**App ID**: `cmk3fq74f03ugif0c83tghcr7`  
**Theme**: Dark mode

### Files Changed
- `components/providers/PrivyProvider.tsx` - New Privy wrapper
- `components/providers/Providers.tsx` - Updated to use Privy
- `hooks/usePrivyWallet.ts` - Custom hook for Privy wallet management

### Migration Notes
- **Removed**: `@react-oauth/google` dependency
- **Removed**: `@solana/wallet-adapter-*` packages (can keep for compatibility)
- **Added**: Privy SDK with built-in Google OAuth + wallet support

### Environment Variables
```env
NEXT_PUBLIC_PRIVY_APP_ID=cmk3fq74f03ugif0c83tghcr7
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<your_project_id>
```

---

## 🎫 2. Invite Code System

### Features
- Each user receives 10 unique invite codes upon registration
- Codes displayed in Portfolio page under "Invites" tab
- Copyable with one-click
- Format: `AXIS-[USER_ID]-[RANDOM]`

### Files Added
- `app/api/user/invite-codes/route.ts` - API routes for invite code management

### Backend Integration Required
**Endpoint**: `POST /auth/register`
```typescript
// Response should include:
{
  success: true,
  user: {
    id: string,
    wallet_address: string,
    invite_codes: string[] // 10 codes
  }
}
```

**Endpoint**: `GET /my-invites?email={email}`
```typescript
// Response:
[
  {
    code: string,
    used_by_user_id: string | null,
    created_at: timestamp
  }
]
```

### Portfolio Page
Already implemented! Check the "Invites" tab in `/app/portfolio/page.tsx`

---

## 🎨 3. Curator Studio

### Route
`/curator-studio`

### Features
- **Performance Analysis Chart** - Strategy vs Benchmark comparison
- **Strategy Engine** - Configurable rebalancing logic
- **Risk Attribution** - Asset-level metrics (Alpha, Beta, Sharpe, etc.)
- **Backtest Simulation** - Mock results with output log
- **Export Functionality** - CSV export for analysis

### Metrics Displayed
- Strategy AUM
- Unit Price (NAV)
- Sharpe Ratio
- Max Drawdown
- Beta (vs SOL)
- Active Wallets

### Files
- `app/curator-studio/page.tsx` - Main curator interface

---

## 🏦 4. Redesigned Vault Detail Page

### Route
`/vault/[id]`

### Components
- `app/vault/[id]/VaultDetailPage.tsx` - Main page component
- `components/vault/SwapPanel.tsx` - Deposit/withdrawal interface

### Features
- **Price Chart** - Interactive with multiple timeframes (1H, 1D, 1W, 1M, 1Y)
- **Swap Panel** - USDC ↔ Vault token exchange
- **Composition Table** - Asset breakdown with weights
- **Vault Details** - Fee structure, contract info
- **Stats Row** - TVL, APY, Holders, 24h Volume

### UI Based On
Image 1 mockup - Clean, professional interface with:
- Large price display
- Real-time metrics
- Asset composition table
- Integrated swap functionality

---

## 🚀 5. Vault Creation Modes

### Selection Page
**Route**: `/create-vault`

Users choose between:

#### Simple Mode → `/create`
- Existing user-friendly wizard (4 steps)
- AI-powered portfolio suggestions
- Drag-and-drop asset allocation
- Quick deployment

#### Curator Mode → `/curator-studio`
- Professional backtesting tools
- Advanced risk analytics
- Institutional-grade metrics
- Strategy engine configuration

---

## 📦 Installation & Setup

### 1. Install Dependencies
```bash
cd axis-mock
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Update with your values:
```env
NEXT_PUBLIC_PRIVY_APP_ID=cmk3fq74f03ugif0c83tghcr7
NEXT_PUBLIC_AXIS_API_BASE_URL=https://axis-api.yusukekikuta-05.workers.dev
NEXT_PUBLIC_JUP_API_KEY=<your_key>
```

### 3. Run Development Server
```bash
npm run dev
```

---

## 🔧 Backend Integration TODO

### 1. Invite Code Generation
Update registration endpoint to generate 10 codes:
```typescript
// In axis-api/src/routes/auth.ts
function generateInviteCodes(userId: string): string[] {
  return Array.from({ length: 10 }, () => {
    const random = crypto.randomUUID().slice(0, 6).toUpperCase();
    return `AXIS-${userId.slice(0, 4)}-${random}`;
  });
}
```

### 2. Invite Code Storage
Add to D1 database schema:
```sql
CREATE TABLE invite_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_user_id TEXT NOT NULL,
  used_by_user_id TEXT,
  created_at INTEGER NOT NULL,
  used_at INTEGER,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (used_by_user_id) REFERENCES users(id)
);
```

### 3. API Endpoints
- `GET /my-invites?email={email}` - Fetch user's codes
- `POST /use-invite` - Redeem an invite code
- `GET /user/invite-codes?userId={id}` - Get codes by user ID

---

## 🎯 Testing Checklist

- [ ] Privy login with wallet
- [ ] Privy login with Google
- [ ] Privy login with email
- [ ] Invite codes display in portfolio
- [ ] Copy invite code to clipboard
- [ ] Navigate to Curator Studio
- [ ] View vault detail page
- [ ] Use swap panel
- [ ] Create vault (simple mode)
- [ ] Create vault (curator mode)

---

## 📝 Notes

### Code Comments
All code comments are in **English** as requested.

### Wallet Provider Migration
The old Solana Wallet Adapter code is replaced with Privy, which provides:
- Better UX with embedded wallets
- Built-in Google OAuth
- Email authentication
- Multi-chain support (future)

### UI/UX Improvements
- Dark theme throughout
- Emerald accent color (#10b981)
- Professional typography
- Smooth transitions and animations

---

## 🚨 Known Issues / Future Work

1. **Privy Package Installation** - May need manual installation if npm times out
2. **Backtest Logic** - Currently uses mock data; needs real implementation
3. **Swap Functionality** - UI only; needs Solana transaction integration
4. **Chart Data** - Using mock data; needs real price feeds
5. **Database Integration** - Invite codes need D1/database storage

---

## 📚 Resources

- [Privy Docs](https://docs.privy.io/)
- [Privy React SDK](https://docs.privy.io/guide/react)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Recharts](https://recharts.org/)

---

## 👥 Support

For questions or issues:
1. Check the implementation guide above
2. Review the code comments in each file
3. Test with the provided mock data first
4. Integrate with backend APIs once frontend is stable
