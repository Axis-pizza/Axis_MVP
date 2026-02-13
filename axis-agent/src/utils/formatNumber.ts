/**
 * Compact USD formatter for market data columns.
 * 7940000000 -> "$7.94B", 15200000 -> "$15.2M", 1200 -> "$1.2K"
 */
export function formatCompactUSD(value: number | undefined | null): string {
  if (value == null || value === 0) return '-';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Abbreviate Solana address: "6p6xgH...GiPN"
 */
export function abbreviateAddress(address: string, chars: number = 4): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
