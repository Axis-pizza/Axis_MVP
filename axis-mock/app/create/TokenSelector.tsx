"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAxisStore } from "@/app/store/useAxisStore";
import { Token } from "@/app/data/mockData";

// ==========================================
// 定数定義
// ==========================================

/** 最大選択可能なトークン数 */
const MAX_TOKENS = 10;

/** ポピュラートークン表示数 */
const POPULAR_TOKENS_LIMIT = 50;

// ==========================================
// 型定義
// ==========================================

/**
 * TokenSelectorコンポーネントのProps
 */
interface TokenSelectorProps {
  /** 現在選択されているトークンのリスト */
  selectedTokens: Token[];
  /** トークンが選択されたときのコールバック */
  onSelect: (token: Token) => void;
  /** トークンが削除されたときのコールバック */
  onRemove: (address: string) => void;
}

// ==========================================
// メインコンポーネント
// ==========================================

/**
 * TokenSelector
 * 
 * トークンを検索・選択するためのコンポーネント
 * - Popoverを使用したドロップダウンUI
 * - コマンドパレット形式での検索
 * - 選択済みトークンのバッジ表示
 * - 最大10トークンまで選択可能
 * 
 * @param props - TokenSelectorProps
 * @returns TokenSelectorコンポーネント
 */
export function TokenSelector({ selectedTokens, onSelect, onRemove }: TokenSelectorProps) {
  // ==========================================
  // ストアとステート
  // ==========================================
  
  const { tokenList, isLoadingTokens } = useAxisStore();
  const [open, setOpen] = useState(false);

  // ==========================================
  // ヘルパー関数
  // ==========================================
  
  /**
   * トークンが既に選択されているかチェック
   * @param address - トークンアドレス
   * @returns 選択済みの場合true
   */
  const isSelected = (address: string): boolean => {
    return selectedTokens.some((t) => t.address === address);
  };

  /**
   * 最大数に達しているかチェック
   * @returns 最大数に達している場合true
   */
  const isMaxReached = (): boolean => {
    return selectedTokens.length >= MAX_TOKENS;
  };

  /**
   * トークン選択ハンドラー
   * 既に選択されていない場合のみ選択を実行
   * @param token - 選択するトークン
   */
  const handleSelectToken = (token: Token) => {
    if (!isSelected(token.address)) {
      onSelect(token);
      setOpen(false);
    }
  };

  // ==========================================
  // レンダリング
  // ==========================================

  return (
    <div className="space-y-4">
      {/* ラベルとトークン選択ボタン */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-400">
          Add Assets (Max {MAX_TOKENS})
        </label>

        <Popover open={open} onOpenChange={setOpen}>
          {/* トリガーボタン */}
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
              disabled={isMaxReached()}
            >
              {isMaxReached() ? "Max assets reached" : "Select token..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          
          {/* ドロップダウンコンテンツ */}
          <PopoverContent className="w-[400px] border-neutral-800 bg-neutral-900 p-0">
            <Command className="bg-transparent">
              {/* 検索入力 */}
              <CommandInput 
                placeholder="Search symbol or name..." 
                className="text-white" 
              />
              
              <CommandList>
                {/* ローディング状態 */}
                {isLoadingTokens && (
                  <div className="p-4 text-center text-sm text-neutral-500">
                    Loading tokens...
                  </div>
                )}
                
                {/* 検索結果が空の場合 */}
                <CommandEmpty>No token found.</CommandEmpty>
                
                {/* ポピュラートークンリスト */}
                <CommandGroup heading="Popular Tokens">
                  {tokenList.slice(0, POPULAR_TOKENS_LIMIT).map((token) => (
                    <CommandItem
                      key={token.address}
                      value={`${token.symbol} ${token.name}`}
                      onSelect={() => handleSelectToken(token)}
                      className={cn(
                        "cursor-pointer aria-selected:bg-neutral-800",
                        isSelected(token.address) && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex w-full items-center gap-3">
                        {/* トークンロゴ */}
                        {token.logoURI ? (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                            {token.symbol?.[0] || '?'}
                          </div>
                        )}
                        
                        {/* トークン情報 */}
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{token.symbol}</span>
                          <span className="text-xs text-neutral-500">{token.name}</span>
                        </div>
                        
                        {/* 選択済みマーク */}
                        {isSelected(token.address) && (
                          <Check className="ml-auto h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* 選択済みトークンのバッジリスト */}
      <div className="flex flex-wrap gap-2">
        {selectedTokens.map((token) => (
          <Badge
            key={token.address}
            variant="secondary"
            className="flex items-center gap-2 border border-neutral-700 bg-neutral-800 py-1 pr-1 pl-2 hover:bg-neutral-700"
          >
            {/* トークンロゴ */}
            {token.logoURI ? (
              <img 
                src={token.logoURI} 
                alt={token.symbol} 
                className="h-4 w-4 rounded-full" 
              />
            ) : (
              <div className="h-4 w-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">
                {token.symbol?.[0] || '?'}
              </div>
            )}
            
            {/* トークンシンボル */}
            <span>{token.symbol}</span>
            
            {/* 削除ボタン */}
            <button
              onClick={() => onRemove(token.address)}
              className="ml-1 rounded-full p-0.5 transition-colors hover:bg-neutral-600"
              aria-label={`Remove ${token.symbol}`}
            >
              <Plus className="h-3 w-3 rotate-45" />
            </button>
          </Badge>
        ))}
        
        {/* トークン未選択時のメッセージ */}
        {selectedTokens.length === 0 && (
          <span className="text-sm text-neutral-600 italic">
            No assets selected yet.
          </span>
        )}
      </div>
    </div>
  );
}
