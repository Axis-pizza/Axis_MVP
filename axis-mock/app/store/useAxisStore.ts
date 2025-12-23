// app/store/useAxisStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Token, INITIAL_VAULTS, VaultStatus } from '../data/mockData';
import { toast } from 'sonner';

// APIのURL (ローカル開発用)
const API_URL = 'https://axis-api.yusukekikuta-05.workers.dev';

// Devnet接続の設定
const NETWORK = 'devnet';
const RPC_ENDPOINT = clusterApiUrl(NETWORK);
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Devnet USDCのMintアドレス
const DEVNET_USDC_MINT = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

// --- Types ---

export interface Vault {
  id: string;
  name: string;
  symbol: string;
  tvl: number;
  apy: number;
  image_url?: string;
  creator: string;
  status?: VaultStatus | string;
  description?: string;
  strategy_type?: string;
  management_fee?: number;
  min_liquidity?: number;
  composition?: any[];
  created_at?: number;
}

interface AxisStore {
  // --- User Info ---
  user: any | null; // ★追加: ユーザー情報オブジェクト全体
  email: string | null;
  inviteCode: string | null;
  walletAddress: string | null;
  isRegistered: boolean;
  isConnected: boolean;
  walletProvider: any | null;
  referralCode: string | null;

  // --- App Data ---
  vaults: Vault[];
  usdcBalance: number;
  solBalance: number;
  positions: any[];
  claimedWallets: string[];
  
  // --- UI/Loading States ---
  isSidebarOpen: boolean;
  isFaucetLoading: boolean;
  isLoadingTokens: boolean;
  tokenList: Token[];

  // --- Actions ---
  
  // Wallet & User
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => void;
  
  // ★ APIを叩いて登録するアクション
  registerUser: (email: string, code: string, wallet: string) => Promise<{ success: boolean; message?: string }>;
  
  // ★ APIを叩かずに状態だけ更新するアクション (Login用)
  login: (userData: any) => void;
  
  // ★ ログアウト用
  logout: () => void;

  // Balance & Faucet
  fetchBalances: () => Promise<void>;
  claimFaucet: () => Promise<void>;
  
  // Vaults
  fetchVaults: () => Promise<void>;
  createVault: (vaultData: any) => Promise<boolean>;
  depositToVault: (vaultId: string, amountUSDC: number) => void;
  toggleVaultStatus: (vaultId: string) => void;

  // Tokens & UI
  fetchTokenList: () => Promise<void>;
  toggleSidebar: (isOpen: boolean) => void;
}

// Helper: Mock Price
const getMockPrice = (symbol: string): number => {
  const prices: Record<string, number> = {
    'USDC': 1.00, 'USDT': 1.00, 'SOL': 145.50, 'BTC': 64200, 'ETH': 3400,
    'JUP': 1.15, 'BONK': 0.000024, 'WIF': 3.20, 'POPCAT': 0.85
  };
  return prices[symbol] || (Math.random() * 10) + 0.1;
};

export const useAxisStore = create<AxisStore>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      user: null,
      email: null,
      inviteCode: null,
      walletAddress: null,
      isRegistered: false,
      isConnected: false,
      walletProvider: null,
      referralCode: null,

      vaults: INITIAL_VAULTS,
      usdcBalance: 0,
      solBalance: 0,
      positions: [],
      claimedWallets: [],

      isSidebarOpen: false,
      isFaucetLoading: false,
      isLoadingTokens: false,
      tokenList: [],

      // --- Actions ---

      // 1. ウォレット接続
      connectWallet: async (address) => {
        set({ 
          isConnected: true, 
          walletAddress: address 
        });
        await get().fetchBalances();
      },

      // 2. 切断
      disconnectWallet: () => {
        set({
          isConnected: false,
          walletAddress: null,
          walletProvider: null,
          usdcBalance: 0,
          solBalance: 0,
          // ログアウトも兼ねる場合
          // isRegistered: false, 
          // user: null,
          // email: null
        });
      },

      // 3. 残高取得
      fetchBalances: async () => {
        const { walletAddress } = get();
        if (!walletAddress) return;

        try {
          const pubkey = new PublicKey(walletAddress);
          const solBalanceLamports = await connection.getBalance(pubkey);
          const solBalance = solBalanceLamports / LAMPORTS_PER_SOL;

          let usdcBalance = 0;
          try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
              programId: TOKEN_PROGRAM_ID,
            });
            const usdcAccount = tokenAccounts.value.find((account) => 
              account.account.data.parsed.info.mint === DEVNET_USDC_MINT
            );
            if (usdcAccount) {
              usdcBalance = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
            }
          } catch (e) {
            // アカウントなし等の場合
          }
          set({ solBalance, usdcBalance });
        } catch (error) {
          console.error("Failed to fetch balances:", error);
        }
      },

      // 4. Faucet
      claimFaucet: async () => {
        const { walletAddress, fetchBalances, claimedWallets } = get();
        if (!walletAddress) return;

        if (claimedWallets.includes(walletAddress)) {
            alert("You have already claimed the faucet for this wallet.");
            return;
        }

        set({ isFaucetLoading: true });

        try {
          const res = await fetch(`${API_URL}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: walletAddress })
          });
          const data = await res.json().catch(() => null);

          if (!res.ok || !data?.success) {
             throw new Error(data?.error || "Faucet API failed");
          }

          set((state) => ({
             claimedWallets: [...state.claimedWallets, walletAddress]
          }));

          setTimeout(async () => {
            await fetchBalances();
          }, 2000);
          
          toast.success("1,000 USDC sent to your Devnet wallet!");

        } catch (error) {
          console.error("Faucet Error:", error);
          toast.error("Faucet failed. Please try again.");
          await fetchBalances(); 
        } finally {
          set({ isFaucetLoading: false });
        }
      },

      // 5. ユーザー登録 (APIコールあり)
      registerUser: async (email, inviteCode, address) => {
        try {
          const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              wallet_address: address,
              invite_code_used: inviteCode
            })
          });

          if (!res.ok) {
             const errData = await res.json().catch(() => ({}));
             return { success: false, message: errData.error || 'Registration failed' };
          }
          
          const data = await res.json();

          set({
            isRegistered: true,
            user: data.user,
            email: email,
            inviteCode: inviteCode,
            walletAddress: address,
            isConnected: true,
            referralCode: data.user?.invite_code || null,
            usdcBalance: 0, 
            solBalance: 0
          });

          await get().fetchBalances();
          return { success: true };

        } catch (error) {
          console.error('API Error:', error);
          return { success: false, message: 'Connection to server failed' };
        }
      },

      // ★ 6. ログイン (APIコールなし。OTP認証後に呼ぶ)
      login: (userData: any) => {
        set({ 
          isRegistered: true, 
          user: userData,
          email: userData.email,
          walletAddress: userData.wallet_address || get().walletAddress, // 既存のWalletを維持するか、DBの値を優先するか
          referralCode: userData.invite_code
        });
      },

      // ★ 7. ログアウト
      logout: () => {
        set({ 
          isRegistered: false, 
          user: null, 
          email: null,
          inviteCode: null,
          referralCode: null
        });
      },

      // --- Vault Actions ---

      fetchVaults: async () => {
        try {
          const res = await fetch(`${API_URL}/vaults`);
          if (res.ok) {
            const data = await res.json();
            set({ vaults: data });
          }
        } catch (e) {
          console.error("Failed to fetch vaults", e);
        }
      },

      createVault: async (vaultData) => {
        try {
          const res = await fetch(`${API_URL}/vaults`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vaultData)
          });
          
          if (res.ok) {
            await get().fetchVaults();
            return true;
          } else {
            const err = await res.json();
            console.error("Backend Error:", err);
            return false;
          }
        } catch (e) {
          console.error("Network/Client Error:", e);
          return false;
        }
      },

      depositToVault: (vaultId, amountUSDC) => {
        const { usdcBalance, vaults } = get();
        const targetVault = vaults.find(v => v.id === vaultId);
        if (!targetVault || usdcBalance < amountUSDC) return;

        const updatedVaults = vaults.map(v => v.id === vaultId ? { ...v, tvl: v.tvl + amountUSDC } : v);
        
        set((state) => ({
          vaults: updatedVaults,
          usdcBalance: state.usdcBalance - amountUSDC,
          positions: [...state.positions, { vaultId, lpAmount: amountUSDC, entryValue: amountUSDC }]
        }));
      },

      toggleVaultStatus: (vaultId) => {
        set((state) => ({
          vaults: state.vaults.map((v) => {
            if (v.id !== vaultId) return v;
            let next: VaultStatus | string = v.status || 'BOOTSTRAP';
            if (v.status === 'BOOTSTRAP') next = 'PUBLIC';
            else if (v.status === 'PUBLIC') next = 'AUCTION_LIVE';
            else if (v.status === 'AUCTION_LIVE') next = 'PUBLIC';
            return { ...v, status: next };
          })
        }));
      },

      // --- Other Actions ---

      fetchTokenList: async () => {
        const { tokenList } = get();
        if (tokenList.length > 0) return;

        set({ isLoadingTokens: true });
        try {
          const response = await fetch(`${API_URL}/tokens`);
          if (!response.ok) throw new Error("Failed to fetch tokens");
          
          const data = await response.json();
          const formattedTokens: Token[] = data.map((t: any) => ({
             ...t,
             price: getMockPrice(t.symbol)
          }));
          
          set({ tokenList: formattedTokens, isLoadingTokens: false });
        } catch (error) {
          console.error(error);
          set({ isLoadingTokens: false });
        }
      },

      toggleSidebar: (isOpen) => set({ isSidebarOpen: isOpen }),
    }),
    {
      name: 'axis-storage-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        isRegistered: state.isRegistered,
        user: state.user, // ユーザー情報も永続化
        email: state.email,
        referralCode: state.referralCode,
        walletAddress: state.walletAddress,
        isConnected: state.isConnected,
        usdcBalance: state.usdcBalance,
        solBalance: state.solBalance,
        positions: state.positions,
        vaults: state.vaults,
        tokenList: state.tokenList,
        claimedWallets: state.claimedWallets,
      }),
    }
  )
);