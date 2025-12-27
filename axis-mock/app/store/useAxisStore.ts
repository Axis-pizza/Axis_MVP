import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Token, INITIAL_VAULTS, VaultStatus } from "../data/mockData";
import { toast } from "sonner";

const API_URL = "https://axis-api.yusukekikuta-05.workers.dev";
const NETWORK = "devnet";
const RPC_ENDPOINT = clusterApiUrl(NETWORK);
const connection = new Connection(RPC_ENDPOINT, "confirmed");
const DEVNET_USDC_MINT = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

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

export interface UserProfile {
  id?: string;
  username: string;
  bio: string;
  pfpUrl: string;
  badges: string[];
}

interface AxisStore {
  user: any | null;
  userProfile: UserProfile | null;
  email: string | null;
  inviteCode: string | null;
  walletAddress: string | null;
  isRegistered: boolean;
  isConnected: boolean;
  walletProvider: any | null;
  referralCode: string | null;

  vaults: Vault[];
  usdcBalance: number;
  solBalance: number;
  positions: any[];
  claimedWallets: string[];

  isSidebarOpen: boolean;
  isFaucetLoading: boolean;
  isLoadingTokens: boolean;
  tokenList: Token[];
  isLoading: boolean;

  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => void;

  registerUser: (
    email: string,
    code: string,
    wallet: string
  ) => Promise<{ success: boolean; message?: string }>;
  login: (userData: any) => void;

  logout: () => void;

  fetchBalances: () => Promise<void>;
  claimFaucet: () => Promise<void>;

  fetchVaults: () => Promise<void>;
  createVault: (vaultData: any) => Promise<boolean>;
  depositToVault: (vaultId: string, amountUSDC: number) => void;
  toggleVaultStatus: (vaultId: string) => void;

  fetchTokenList: () => Promise<void>;
  toggleSidebar: (isOpen: boolean) => void;

  registerWithWallet: () => Promise<boolean>;

  fetchUserProfile: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  addBadge: (badgeId: string) => void;
}

const getMockPrice = (symbol: string): number => {
  const prices: Record<string, number> = {
    USDC: 1.0,
    USDT: 1.0,
    SOL: 145.5,
    BTC: 64200,
    ETH: 3400,
    JUP: 1.15,
    BONK: 0.000024,
    WIF: 3.2,
    POPCAT: 0.85,
  };
  return prices[symbol] || Math.random() * 10 + 0.1;
};

export const useAxisStore = create<AxisStore>()(
  persist(
    (set, get) => ({
      user: null,
      email: null,
      userProfile: null,
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
      isLoading: false,
      tokenList: [],

      connectWallet: async (address) => {
        set({ isConnected: true, walletAddress: address });
        await get().fetchBalances();
        await get().fetchUserProfile();
      },

      disconnectWallet: () => {
        set({
          isConnected: false,
          walletAddress: null,
          walletProvider: null,
          usdcBalance: 0,
          solBalance: 0,
        });
      },

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
            const usdcAccount = tokenAccounts.value.find(
              (account) => account.account.data.parsed.info.mint === DEVNET_USDC_MINT
            );
            if (usdcAccount) {
              usdcBalance = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
            }
          } catch (e) {}
          set({ solBalance, usdcBalance });
        } catch (error) {
          console.error("Failed to fetch balances:", error);
        }
      },

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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet_address: walletAddress }),
          });
          const data = await res.json().catch(() => null);

          if (!res.ok || !data?.success) {
            throw new Error(data?.error || "Faucet API failed");
          }

          set((state) => ({
            claimedWallets: [...state.claimedWallets, walletAddress],
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

      registerUser: async (email, inviteCode, address) => {
        try {
          const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              wallet_address: address,
              invite_code_used: inviteCode,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, message: errData.error || "Registration failed" };
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
            solBalance: 0,
          });

          await get().fetchBalances();
          return { success: true };
        } catch (error) {
          console.error("API Error:", error);
          return { success: false, message: "Connection to server failed" };
        }
      },

      login: (userData: any) => {
        set({
          isRegistered: true,
          user: userData,
          email: userData.email,
          walletAddress: userData.wallet_address || get().walletAddress,
          referralCode: userData.invite_code,
        });
      },

      logout: () => {
        set({
          isRegistered: false,
          user: null,
          email: null,
          inviteCode: null,
          referralCode: null,
        });
      },

      fetchVaults: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API_URL}/vaults`);
          if (res.ok) {
            const data = await res.json();
            set({ vaults: data });
          }
        } catch (e) {
          console.error("Failed to fetch vaults", e);
        } finally {
          set({ isLoading: false });
        }
      },

      createVault: async (vaultData) => {
        try {
          const res = await fetch(`${API_URL}/vaults`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vaultData),
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
        const targetVault = vaults.find((v) => v.id === vaultId);
        if (!targetVault || usdcBalance < amountUSDC) return;

        const updatedVaults = vaults.map((v) =>
          v.id === vaultId ? { ...v, tvl: v.tvl + amountUSDC } : v
        );

        set((state) => ({
          vaults: updatedVaults,
          usdcBalance: state.usdcBalance - amountUSDC,
          positions: [
            ...state.positions,
            { vaultId, lpAmount: amountUSDC, entryValue: amountUSDC },
          ],
        }));
      },

      toggleVaultStatus: (vaultId) => {
        set((state) => ({
          vaults: state.vaults.map((v) => {
            if (v.id !== vaultId) return v;
            let next: VaultStatus | string = v.status || "BOOTSTRAP";
            if (v.status === "BOOTSTRAP") next = "PUBLIC";
            else if (v.status === "PUBLIC") next = "AUCTION_LIVE";
            else if (v.status === "AUCTION_LIVE") next = "PUBLIC";
            return { ...v, status: next };
          }),
        }));
      },

      fetchUserProfile: async () => {
        const { walletAddress } = get();
        if (!walletAddress) return;

        try {
          const res = await fetch(`${API_URL}/user?wallet=${walletAddress}`);
          if (res.ok) {
            const data = await res.json();

            const isRegistered = !!(data && data.username);

            set({
              isRegistered,
              userProfile: {
                username: data.username || "",
                bio: data.bio || "",
                pfpUrl: data.pfpUrl || "",
                badges: data.badges || [],
              },
            });
          } else {
            set({ isRegistered: false });
          }
        } catch (e) {
          console.error("Fetch profile failed:", e);
        }
      },

      registerWithWallet: async () => {
        const { walletAddress } = get();
        if (!walletAddress) return false;

        try {
          const res = await fetch(`${API_URL}/auth/social-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "solana",
              wallet_address: walletAddress,
            }),
          });

          const data = await res.json();
          if (data.success) {
            set({ isRegistered: true });
            return true;
          }
          return false;
        } catch (e) {
          console.error("Registration failed:", e);
          return false;
        }
      },

      updateUserProfile: async (data) => {
        const { walletAddress, userProfile, isRegistered, registerWithWallet } = get();

        if (!walletAddress) {
          toast.error("Wallet not connected");
          return false;
        }

        if (!isRegistered) {
          console.log("User is Guest. Registering first...");
          const regSuccess = await registerWithWallet();

          if (!regSuccess) {
            toast.error("Failed to create account.");
            return false;
          }
        }

        const newProfile = { ...userProfile, ...data } as UserProfile;

        try {
          const res = await fetch(`${API_URL}/user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet_address: walletAddress,
              name: newProfile.username,
              bio: newProfile.bio,
              avatar_url: newProfile.pfpUrl,
              badges: newProfile.badges,
            }),
          });

          const result = await res.json();

          if (!res.ok) {
            console.error("Update failed:", result);
            toast.error(result.error || "Failed to update profile");
            return false;
          }

          set({ userProfile: newProfile, isRegistered: true });

          set((state) => ({
            user: state.user
              ? { ...state.user, name: newProfile.username, avatar_url: newProfile.pfpUrl }
              : state.user,
          }));

          return true;
        } catch (e) {
          console.error("Network Error:", e);
          toast.error("Connection error.");
          return false;
        }
      },

      addBadge: (badgeId) => {
        const { userProfile } = get();
        if (!userProfile) return;
        if (!userProfile.badges.includes(badgeId)) {
          const newBadges = [...userProfile.badges, badgeId];
          set({ userProfile: { ...userProfile, badges: newBadges } });
        }
      },

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
            price: getMockPrice(t.symbol),
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
      name: "axis-storage-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isRegistered: state.isRegistered,
        user: state.user,
        email: state.email,
        userProfile: state.userProfile,
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
