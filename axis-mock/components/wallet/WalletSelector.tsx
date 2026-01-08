"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAxisStore } from "@/app/store/useAxisStore";
import { Wallet } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

// ==========================================
// メインコンポーネント
// ==========================================

/**
 * WalletSelector
 * 
 * Privy認証を使用したウォレット接続コンポーネント
 * 
 * 機能:
 * - Privyモーダルを表示してウォレット接続
 * - メール、ソーシャルログイン、ウォレット接続をサポート
 * - マルチチェーン対応（Ethereum, Solana）
 * - 接続成功後に自動でストアに同期
 * - 既に接続されている場合は非表示
 * 
 * @returns WalletSelectorコンポーネント
 */
export function WalletSelector() {
  // ==========================================
  // フックとステート
  // ==========================================
  
  const { 
    ready,
    authenticated,
    login,
    user,
  } = usePrivy();
  
  const { 
    connectWallet: syncStoreWallet, 
    isConnected: isStoreConnected 
  } = useAxisStore();

  // ==========================================
  // エフェクト
  // ==========================================

  /**
   * ウォレット接続成功時の処理
   * グローバルストアに接続情報を同期
   */
  useEffect(() => {
    if (authenticated && user) {
      // ウォレット情報を取得
      const walletAccounts = user.linkedAccounts?.filter((account: any) => account.type === 'wallet') || [];
      const walletAddress = user.wallet?.address || (walletAccounts.length > 0 ? (walletAccounts[0] as any).address : undefined);
      
      if (walletAddress) {
        // ウォレットタイプを判定（デフォルトはPrivy）
        const walletType = user.wallet?.walletClientType || "Privy";
        syncStoreWallet(walletType);
      }
    }
  }, [authenticated, user, syncStoreWallet]);

  // ==========================================
  // イベントハンドラー
  // ==========================================

  /**
   * ウォレット接続ハンドラー
   * Privyのログインモーダルを開く
   */
  const handleConnect = () => {
    login();
  };

  // ==========================================
  // レンダリング
  // ==========================================

  // Privyがまだ準備できていない場合はローディング状態
  if (!ready) {
    return (
      <Button disabled className="bg-white font-bold text-black">
        <Wallet className="mr-2 h-4 w-4" /> 
        Loading...
      </Button>
    );
  }

  // 既に接続されている場合は何も表示しない
  if (authenticated) return null;

  return (
    <Button 
      onClick={handleConnect}
      className="bg-white font-bold text-black shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)] transition-all hover:bg-neutral-200"
    >
      <Wallet className="mr-2 h-4 w-4" /> 
      Connect Wallet
    </Button>
  );
}
