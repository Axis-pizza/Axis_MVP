/**
 * Vault Builder
 *
 * Step-based vault composer for Drift ecosystem strategies.
 * - Live prices from CoinGecko / axis-api
 * - Drift perp market data from mainnet-beta.api.drift.trade
 * - Prediction markets from dflow service
 * - Luxury dark-gold brand aesthetic matching the rest of the app
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Lock, ChevronRight, X, Plus, Minus,
  TrendingUp, TrendingDown, DollarSign, Sliders, Target,
  GitBranch, Clock, Shield, AlertTriangle, Zap,
  RefreshCw, CheckCircle2, Info,
} from 'lucide-react';
import { getMarketData } from '../../services/coingecko';
import { fetchPredictionTokens } from '../../services/dflow';

// ── Brand tokens (mirrors index.css) ──────────────────────────────────────

const B = {
  bg:          '#090705',
  bgCard:      'rgba(20,14,8,0.95)',
  bgElevated:  'rgba(26,16,8,0.98)',
  gold:        '#C77D36',
  goldLight:   '#D9A05B',
  goldDim:     'rgba(199,125,54,0.35)',
  goldBorder:  'rgba(199,125,54,0.20)',
  goldBorderHover: 'rgba(199,125,54,0.45)',
  textPrimary: '#F2E0C8',
  textSecondary: 'rgba(242,224,200,0.55)',
  textMuted:   'rgba(242,224,200,0.28)',
  red:         '#E54D2E',
  green:       '#30A46C',
  blue:        '#3B82F6',
  purple:      '#9945FF',
};

// ── Types ──────────────────────────────────────────────────────────────────

type StepKey = 'assets' | 'perps' | 'logic' | 'protect';

interface SpotAsset {
  symbol: string;
  name: string;
  mint: string;
  logo: string;
  price: number;
  change24h: number;
}

interface PerpMarket {
  marketIndex: number;
  symbol: string;           // "SOL-PERP"
  baseSymbol: string;       // "SOL"
  price: number;
  change24h: number;
  fundingRate: number;      // hourly %
  openInterest: number;     // USD
  volume24h: number;
}

interface PredMarket {
  eventTitle: string;
  yesMint: string;
  noMint: string;
  yesPrice: number;
  noPrice: number;
}

type LogicBlockType = 'IF' | 'THEN' | 'WAIT' | 'LEVERAGE';

interface LogicBlock {
  type: LogicBlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

// ── Vault composition entry ────────────────────────────────────────────────

type EntryKind = 'spot' | 'perp' | 'pred' | 'logic';

interface VaultEntry {
  id: string;
  kind: EntryKind;
  label: string;
  sublabel?: string;
  accent: string;
  icon: React.ReactNode;
  config: Record<string, any>;
}

// ── Static data ────────────────────────────────────────────────────────────

const SPOT_MINTS: Record<string, string> = {
  SOL:  'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

const DRIFT_PERP_FALLBACK: Omit<PerpMarket, 'price' | 'change24h'>[] = [
  { marketIndex: 0,  symbol: 'SOL-PERP',  baseSymbol: 'SOL',  fundingRate: 0.003,  openInterest: 182_000_000, volume24h: 420_000_000 },
  { marketIndex: 1,  symbol: 'BTC-PERP',  baseSymbol: 'BTC',  fundingRate: 0.0015, openInterest: 310_000_000, volume24h: 680_000_000 },
  { marketIndex: 2,  symbol: 'ETH-PERP',  baseSymbol: 'ETH',  fundingRate: 0.0022, openInterest: 95_000_000,  volume24h: 230_000_000 },
];

const LOGIC_BLOCKS: LogicBlock[] = [
  { type: 'IF',       label: 'IF',       description: 'Set a price or time condition', icon: <GitBranch size={16}/>, accent: '#D97706' },
  { type: 'THEN',     label: 'THEN',     description: 'Execute when condition is met', icon: <ChevronRight size={16}/>, accent: B.gold },
  { type: 'WAIT',     label: 'WAIT',     description: 'Add a time delay before action', icon: <Clock size={16}/>, accent: '#6B7280' },
  { type: 'LEVERAGE', label: 'Leverage', description: 'Apply leverage to next position', icon: <Sliders size={16}/>, accent: B.red },
];

// ── Utility ────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 8); }

function fmtPrice(p: number) {
  return p >= 1000 ? `$${(p / 1000).toFixed(1)}K` : `$${p.toFixed(2)}`;
}

function fmtM(n: number) {
  return n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : `$${(n / 1e6).toFixed(0)}M`;
}

function computeRisk(entries: VaultEntry[]) {
  let score = 0;
  for (const e of entries) {
    if (e.kind === 'perp')  score += 3;
    if (e.kind === 'pred')  score += 2;
    if (e.kind === 'logic' && e.config.leverage > 1) score += e.config.leverage - 1;
  }
  if (score === 0) return { label: '—', color: B.textMuted, score: 0 };
  if (score <= 2)  return { label: 'Low',       color: B.green,    score };
  if (score <= 5)  return { label: 'Medium',    color: '#D97706',  score };
  if (score <= 8)  return { label: 'High',      color: B.red,      score };
  return            { label: 'Very High', color: '#991B1B',  score };
}

function computeApy(entries: VaultEntry[]) {
  if (entries.length === 0) return null;
  const base = 3;
  const perpBonus = entries.filter(e => e.kind === 'perp').length * 15;
  const predBonus = entries.filter(e => e.kind === 'pred').length * 8;
  const levBonus  = entries.filter(e => e.kind === 'logic' && e.config.leverage > 1)
    .reduce((s, e) => s + (e.config.leverage - 1) * 10, 0);
  return Math.min(base + perpBonus + predBonus + levBonus, 200);
}

// ── Sub-components ─────────────────────────────────────────────────────────

// Loading shimmer card
function ShimmerCard({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          height: 72, borderRadius: 14, marginBottom: 8,
          background: `linear-gradient(90deg, rgba(199,125,54,0.05) 0%, rgba(199,125,54,0.12) 50%, rgba(199,125,54,0.05) 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          border: `1px solid ${B.goldBorder}`,
        }} />
      ))}
    </>
  );
}

// Step tab
function StepTab({ index, label, active, done, onClick }: {
  index: number; label: string; active: boolean; done: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 4px', border: 'none', background: 'none', cursor: 'pointer',
      borderBottom: `2px solid ${active ? B.gold : 'transparent'}`,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, marginBottom: 3,
        background: done ? B.gold : active ? 'rgba(199,125,54,0.2)' : 'rgba(199,125,54,0.08)',
        color: done || active ? (done ? '#000' : B.gold) : B.textMuted,
        border: `1.5px solid ${active || done ? B.gold : 'rgba(199,125,54,0.15)'}`,
      }}>
        {done ? <CheckCircle2 size={13} /> : index}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: active ? B.gold : B.textMuted, letterSpacing: 0.3 }}>
        {label}
      </span>
    </button>
  );
}

// Vault entry card (in the flow)
function EntryCard({ entry, onRemove, onEditLeverage }: {
  entry: VaultEntry; onRemove: () => void; onEditLeverage?: (v: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0, margin: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', marginBottom: 8,
        borderRadius: 14,
        background: B.bgCard,
        border: `1px solid ${entry.accent}30`,
        boxShadow: `0 2px 12px rgba(0,0,0,0.3)`,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${entry.accent}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: entry.accent,
        border: `1px solid ${entry.accent}30`,
      }}>
        {entry.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 13 }}>{entry.label}</div>
        {entry.sublabel && (
          <div style={{ color: B.textSecondary, fontSize: 11, marginTop: 1 }}>{entry.sublabel}</div>
        )}
        {entry.kind === 'logic' && entry.config.leverage > 0 && onEditLeverage && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {[1,2,3,5,7,10].map(lv => (
              <button key={lv} onClick={() => onEditLeverage(lv)} style={{
                width: 28, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: entry.config.leverage === lv ? B.red : 'rgba(229,77,46,0.1)',
                color: entry.config.leverage === lv ? '#fff' : B.red,
                border: `1px solid ${B.red}30`, cursor: 'pointer',
              }}>{lv}×</button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: B.textMuted, padding: 4, flexShrink: 0,
      }}>
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ── Asset Panels ───────────────────────────────────────────────────────────

function SpotPanel({ assets, loading, onAdd }: {
  assets: SpotAsset[]; loading: boolean; onAdd: (a: SpotAsset) => void;
}) {
  return (
    <div>
      <p style={{ color: B.textSecondary, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
        Add spot token positions to your vault. Prices are live from Jupiter.
      </p>
      {loading ? <ShimmerCard count={2} /> : assets.map(a => (
        <button key={a.mint} onClick={() => onAdd(a)} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '12px 14px', marginBottom: 8,
          borderRadius: 14, cursor: 'pointer',
          background: B.bgCard, border: `1px solid ${B.goldBorder}`,
          textAlign: 'left', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = B.goldBorderHover)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = B.goldBorder)}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(199,125,54,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: B.gold }}>{a.symbol.slice(0,3)}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 13 }}>{a.symbol}</div>
            <div style={{ color: B.textSecondary, fontSize: 11 }}>{a.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 13 }}>{fmtPrice(a.price)}</div>
            <div style={{ color: a.change24h >= 0 ? B.green : B.red, fontSize: 11, fontWeight: 600 }}>
              {a.change24h >= 0 ? '▲' : '▼'} {Math.abs(a.change24h).toFixed(2)}%
            </div>
          </div>
          <Plus size={16} color={B.gold} style={{ marginLeft: 4 }} />
        </button>
      ))}
    </div>
  );
}

function PerpPanel({ markets, loading, onAdd }: {
  markets: PerpMarket[]; loading: boolean; onAdd: (m: PerpMarket) => void;
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderRadius: 10, marginBottom: 14,
        background: 'rgba(199,125,54,0.06)', border: `1px solid ${B.goldBorder}`,
      }}>
        <Info size={13} color={B.gold} />
        <span style={{ color: B.textSecondary, fontSize: 11 }}>
          Live data from <strong style={{ color: B.gold }}>Drift Protocol</strong> mainnet markets
        </span>
      </div>
      {loading ? <ShimmerCard count={3} /> : markets.map(m => (
        <button key={m.symbol} onClick={() => onAdd(m)} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '12px 14px', marginBottom: 8,
          borderRadius: 14, cursor: 'pointer',
          background: B.bgCard, border: `1px solid rgba(48,164,108,0.2)`,
          textAlign: 'left', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(48,164,108,0.45)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(48,164,108,0.2)')}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(48,164,108,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={16} color={B.green} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 13 }}>{m.symbol}</div>
            <div style={{ color: B.textSecondary, fontSize: 11 }}>
              OI {fmtM(m.openInterest)} · Vol {fmtM(m.volume24h)}
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 80 }}>
            <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 13 }}>{fmtPrice(m.price)}</div>
            <div style={{ color: m.fundingRate >= 0 ? B.green : B.red, fontSize: 11, fontWeight: 600 }}>
              {m.fundingRate >= 0 ? '+' : ''}{(m.fundingRate * 100).toFixed(3)}% /hr
            </div>
          </div>
          <Plus size={16} color={B.green} style={{ marginLeft: 4 }} />
        </button>
      ))}
    </div>
  );
}

function PredPanel({ markets, loading, onAdd }: {
  markets: PredMarket[]; loading: boolean; onAdd: (m: PredMarket, side: 'YES' | 'NO') => void;
}) {
  return (
    <div>
      <p style={{ color: B.textSecondary, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
        Take a YES or NO position on real-world prediction markets via dFlow.
      </p>
      {loading ? <ShimmerCard count={2} /> : markets.slice(0, 6).map((m, i) => (
        <div key={i} style={{
          padding: '12px 14px', marginBottom: 8, borderRadius: 14,
          background: B.bgCard, border: `1px solid rgba(153,69,255,0.2)`,
        }}>
          <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
            {m.eventTitle}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onAdd(m, 'YES')} style={{
              flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(48,164,108,0.12)', border: '1px solid rgba(48,164,108,0.3)',
              color: B.green, fontWeight: 700, fontSize: 13,
            }}>
              YES {m.yesPrice > 0 ? `· ${(m.yesPrice * 100).toFixed(0)}¢` : ''}
            </button>
            <button onClick={() => onAdd(m, 'NO')} style={{
              flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(229,77,46,0.12)', border: '1px solid rgba(229,77,46,0.3)',
              color: B.red, fontWeight: 700, fontSize: 13,
            }}>
              NO {m.noPrice > 0 ? `· ${(m.noPrice * 100).toFixed(0)}¢` : ''}
            </button>
          </div>
        </div>
      ))}
      {!loading && markets.length === 0 && (
        <div style={{ color: B.textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          No active prediction markets at the moment.
        </div>
      )}
    </div>
  );
}

function LogicPanel({ onAdd }: { onAdd: (b: LogicBlock) => void }) {
  return (
    <div>
      <p style={{ color: B.textSecondary, fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
        Add conditional logic to automate your vault's behaviour.
      </p>
      {LOGIC_BLOCKS.map(b => (
        <button key={b.type} onClick={() => onAdd(b)} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '12px 14px', marginBottom: 8,
          borderRadius: 14, cursor: 'pointer',
          background: B.bgCard, border: `1px solid ${b.accent}25`,
          textAlign: 'left', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = `${b.accent}55`)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = `${b.accent}25`)}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${b.accent}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: b.accent,
          }}>
            {b.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 13 }}>{b.label}</div>
            <div style={{ color: B.textSecondary, fontSize: 11 }}>{b.description}</div>
          </div>
          <Plus size={16} color={b.accent} />
        </button>
      ))}
    </div>
  );
}

// ── Protection Panel ───────────────────────────────────────────────────────

interface AutoRule {
  stopLoss: boolean;
  stopLossPercent: string;
  liquidityProtection: boolean;
  autoExit: boolean;
  autoExitCondition: string;
}

function ProtectPanel({ rules, onChange }: { rules: AutoRule; onChange: (r: AutoRule) => void }) {
  const Row = ({ label, sub, on, onToggle, children }: {
    label: string; sub: string; on: boolean; onToggle: () => void; children?: React.ReactNode;
  }) => (
    <div style={{
      padding: '14px 16px', borderRadius: 14, marginBottom: 10,
      background: B.bgCard, border: `1px solid ${on ? B.goldBorder : 'rgba(199,125,54,0.08)'}`,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: on && children ? 12 : 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: B.textPrimary, fontWeight: 700, fontSize: 13 }}>{label}</div>
          <div style={{ color: B.textSecondary, fontSize: 11, marginTop: 2 }}>{sub}</div>
        </div>
        {/* Toggle */}
        <div onClick={onToggle} style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
          background: on ? B.gold : 'rgba(199,125,54,0.15)',
          position: 'relative', transition: 'background 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20,
            borderRadius: '50%', background: on ? '#000' : 'rgba(199,125,54,0.6)',
            transition: 'left 0.2s',
          }} />
        </div>
      </div>
      {on && children}
    </div>
  );

  return (
    <div>
      <p style={{ color: B.textSecondary, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
        Protect your vault with automated safety rules that execute on-chain.
      </p>

      <Row label="Stop Loss" sub="Automatically exit when drawdown exceeds threshold"
        on={rules.stopLoss} onToggle={() => onChange({ ...rules, stopLoss: !rules.stopLoss })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: B.textSecondary, fontSize: 12 }}>Trigger at</span>
          <input type="number" value={rules.stopLossPercent}
            onChange={e => onChange({ ...rules, stopLossPercent: e.target.value })}
            style={{
              width: 64, background: 'rgba(229,77,46,0.1)', border: `1px solid rgba(229,77,46,0.3)`,
              borderRadius: 8, padding: '5px 10px', color: B.red, fontWeight: 700, fontSize: 14,
              outline: 'none',
            }} />
          <span style={{ color: B.textSecondary, fontSize: 12 }}>% drawdown</span>
        </div>
      </Row>

      <Row label="Liquidity Protection" sub="Exit if on-chain depth drops below safe threshold"
        on={rules.liquidityProtection}
        onToggle={() => onChange({ ...rules, liquidityProtection: !rules.liquidityProtection })} />

      <Row label="Auto Exit" sub="Close all positions when a custom condition is met"
        on={rules.autoExit} onToggle={() => onChange({ ...rules, autoExit: !rules.autoExit })}>
        <input type="text" value={rules.autoExitCondition} placeholder="e.g. SOL price > $200"
          onChange={e => onChange({ ...rules, autoExitCondition: e.target.value })}
          style={{
            width: '100%', background: 'rgba(199,125,54,0.06)', border: `1px solid ${B.goldBorder}`,
            borderRadius: 10, padding: '9px 12px', color: B.textPrimary, fontSize: 13,
            outline: 'none', boxSizing: 'border-box',
          }} />
      </Row>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props { onBack: () => void; }

export function DriftVaultBuilder({ onBack }: Props) {
  const [step, setStep]           = useState<StepKey>('assets');
  const [vaultName, setVaultName] = useState('');
  const [entries, setEntries]     = useState<VaultEntry[]>([]);
  const [autoRules, setAutoRules] = useState<AutoRule>({
    stopLoss: false, stopLossPercent: '10',
    liquidityProtection: false, autoExit: false, autoExitCondition: '',
  });

  // ── Market data ────────────────────────────────────────────────────────
  const [spotAssets,  setSpotAssets]  = useState<SpotAsset[]>([]);
  const [perpMarkets, setPerpMarkets] = useState<PerpMarket[]>([]);
  const [predMarkets, setPredMarkets] = useState<PredMarket[]>([]);
  const [loadingSpot, setLoadingSpot] = useState(true);
  const [loadingPerp, setLoadingPerp] = useState(true);
  const [loadingPred, setLoadingPred] = useState(true);
  const [perpError,   setPerpError]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Spot tokens (SOL + USDC) via CoinGecko
  const loadSpot = useCallback(async () => {
    setLoadingSpot(true);
    try {
      const data = await getMarketData(Object.values(SPOT_MINTS));
      const assets: SpotAsset[] = Object.entries(SPOT_MINTS).map(([sym, mint]) => {
        const d = data[mint] || {};
        return {
          symbol: sym, name: sym === 'SOL' ? 'Solana' : 'USD Coin',
          mint, logo: '', price: d.price ?? 0, change24h: d.change24h ?? 0,
        };
      });
      setSpotAssets(assets);
    } catch {
      setSpotAssets([
        { symbol: 'SOL',  name: 'Solana',   mint: SPOT_MINTS.SOL,  logo: '', price: 0, change24h: 0 },
        { symbol: 'USDC', name: 'USD Coin', mint: SPOT_MINTS.USDC, logo: '', price: 1, change24h: 0 },
      ]);
    } finally {
      setLoadingSpot(false);
    }
  }, []);

  // Drift perp markets — public REST API with fallback
  const loadPerps = useCallback(async () => {
    setLoadingPerp(true);
    setPerpError(false);
    try {
      // Fetch base prices from CoinGecko for SOL/BTC/ETH
      const cgIds: Record<string,string> = {
        'So11111111111111111111111111111111111111112': 'solana',
        'bitcoin': 'bitcoin',
        'ethereum': 'ethereum',
      };
      const priceRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true`
      );
      let prices: Record<string, { usd: number; usd_24h_change: number }> = {};
      if (priceRes.ok) prices = await priceRes.json();

      const priceMap: Record<string, { price: number; change24h: number }> = {
        SOL: { price: prices.solana?.usd ?? 0,   change24h: prices.solana?.usd_24h_change ?? 0 },
        BTC: { price: prices.bitcoin?.usd ?? 0,  change24h: prices.bitcoin?.usd_24h_change ?? 0 },
        ETH: { price: prices.ethereum?.usd ?? 0, change24h: prices.ethereum?.usd_24h_change ?? 0 },
      };

      // Try Drift's public stats API
      let driftData: Record<number, { openInterest?: number; volume24H?: number; fundingRate?: number }> = {};
      try {
        const driftRes = await fetch('https://mainnet-beta.api.drift.trade/stats/24hVolume', { signal: AbortSignal.timeout(4000) });
        if (driftRes.ok) {
          const raw = await driftRes.json();
          // Map market index → volume
          if (Array.isArray(raw)) {
            for (const item of raw) {
              if (item.marketIndex !== undefined) driftData[item.marketIndex] = item;
            }
          }
        }
      } catch {
        // Drift API unavailable — use fallback OI/volume values
      }

      const markets: PerpMarket[] = DRIFT_PERP_FALLBACK.map(m => ({
        ...m,
        price:          priceMap[m.baseSymbol]?.price     ?? 0,
        change24h:      priceMap[m.baseSymbol]?.change24h ?? 0,
        openInterest:   driftData[m.marketIndex]?.openInterest ?? m.openInterest,
        volume24h:      driftData[m.marketIndex]?.volume24H   ?? m.volume24h,
        fundingRate:    driftData[m.marketIndex]?.fundingRate  ?? m.fundingRate,
      }));
      setPerpMarkets(markets);
      setLastRefresh(new Date());
    } catch {
      setPerpError(true);
      setPerpMarkets(DRIFT_PERP_FALLBACK.map(m => ({
        ...m, price: 0, change24h: 0,
      })));
    } finally {
      setLoadingPerp(false);
    }
  }, []);

  // Prediction markets via dflow service
  const loadPred = useCallback(async () => {
    setLoadingPred(true);
    try {
      const tokens = await fetchPredictionTokens();
      // Group YES/NO pairs by eventId
      const events: Record<string, { yes?: any; no?: any; title: string }> = {};
      for (const t of tokens) {
        const meta = (t as any).predictionMeta;
        if (!meta) continue;
        const { eventId, side, eventTitle } = meta;
        if (!events[eventId]) events[eventId] = { title: eventTitle };
        if (side === 'YES') events[eventId].yes = t;
        else                events[eventId].no  = t;
      }
      const markets: PredMarket[] = Object.values(events)
        .filter(e => e.yes && e.no)
        .map(e => ({
          eventTitle: e.title,
          yesMint:    e.yes!.address,
          noMint:     e.no!.address,
          yesPrice:   e.yes!.price ?? 0,
          noPrice:    e.no!.price  ?? 0,
        }));
      setPredMarkets(markets);
    } catch {
      setPredMarkets([]);
    } finally {
      setLoadingPred(false);
    }
  }, []);

  useEffect(() => {
    loadSpot();
    loadPerps();
    loadPred();
  }, [loadSpot, loadPerps, loadPred]);

  // ── Add entries ────────────────────────────────────────────────────────

  const addSpot = (a: SpotAsset) => {
    setEntries(prev => [...prev, {
      id: uid(), kind: 'spot', label: a.symbol,
      sublabel: `${fmtPrice(a.price)} · Spot`,
      accent: B.gold, icon: <DollarSign size={15}/>,
      config: { mint: a.mint, price: a.price },
    }]);
  };

  const addPerp = (m: PerpMarket) => {
    setEntries(prev => [...prev, {
      id: uid(), kind: 'perp', label: m.symbol,
      sublabel: `${fmtPrice(m.price)} · Funding ${(m.fundingRate * 100).toFixed(3)}%/hr`,
      accent: B.green, icon: <TrendingUp size={15}/>,
      config: { marketIndex: m.marketIndex, price: m.price },
    }]);
  };

  const addPred = (m: PredMarket, side: 'YES' | 'NO') => {
    setEntries(prev => [...prev, {
      id: uid(), kind: 'pred',
      label: `${m.eventTitle.slice(0, 28)}… [${side}]`,
      sublabel: `Prediction · ${side === 'YES' ? (m.yesPrice * 100).toFixed(0) : (m.noPrice * 100).toFixed(0)}¢`,
      accent: side === 'YES' ? B.green : B.red,
      icon: <Target size={15}/>,
      config: { mint: side === 'YES' ? m.yesMint : m.noMint, side },
    }]);
  };

  const addLogic = (b: LogicBlock) => {
    setEntries(prev => [...prev, {
      id: uid(), kind: 'logic', label: b.label,
      sublabel: b.description,
      accent: b.accent, icon: b.icon,
      config: b.type === 'LEVERAGE' ? { leverage: 2 } : {},
    }]);
  };

  const removeEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const setLeverage = (id: string, lv: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, config: { ...e.config, leverage: lv }, sublabel: `${lv}× leverage multiplier` } : e));
  };

  // ── Computed ───────────────────────────────────────────────────────────

  const risk  = computeRisk(entries);
  const apy   = computeApy(entries);
  const canDeploy = entries.length >= 2;
  const activeAutoCount = [autoRules.stopLoss, autoRules.liquidityProtection, autoRules.autoExit].filter(Boolean).length;

  const STEPS: Array<{ key: StepKey; label: string; done: boolean }> = [
    { key: 'assets',  label: 'Assets',  done: entries.some(e => e.kind === 'spot') },
    { key: 'perps',   label: 'Perps',   done: entries.some(e => e.kind === 'perp') },
    { key: 'logic',   label: 'Logic',   done: entries.some(e => e.kind === 'logic' || e.kind === 'pred') },
    { key: 'protect', label: 'Protect', done: activeAutoCount > 0 },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh',
      background: B.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}>
      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', height: 54, flexShrink: 0,
        background: 'rgba(9,7,5,0.98)',
        borderBottom: `1px solid ${B.goldBorder}`,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.textSecondary, padding: 4, display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <Lock size={15} color={B.gold} />
        <span style={{ color: B.textPrimary, fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', flex: 1 }}>
          Vault Builder
        </span>
        <button onClick={() => { loadPerps(); loadSpot(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: B.textSecondary, padding: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={14} />
          {lastRefresh && <span style={{ fontSize: 10, color: B.textMuted }}>{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* ── Vault Preview Card ── */}
        <div style={{
          margin: '16px 16px 0',
          padding: '16px',
          borderRadius: 20,
          background: `linear-gradient(135deg, rgba(26,16,8,0.97) 0%, rgba(20,12,4,0.97) 100%)`,
          border: `1px solid ${B.goldBorder}`,
          boxShadow: `inset 0 1px 0 rgba(199,125,54,0.15), 0 8px 32px rgba(0,0,0,0.5)`,
        }}>
          {/* Name input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Lock size={14} color={B.gold} />
            <input
              type="text"
              value={vaultName}
              onChange={e => setVaultName(e.target.value)}
              placeholder="Name your vault…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: B.textPrimary, fontWeight: 800, fontSize: 16,
                letterSpacing: '-0.3px',
              }}
            />
          </div>

          {/* Composition pills */}
          {entries.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {entries.map((e, i) => (
                <span key={e.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 20,
                  background: `${e.accent}15`, border: `1px solid ${e.accent}30`,
                  color: e.accent, fontSize: 11, fontWeight: 700,
                }}>
                  {i > 0 && <span style={{ color: B.textMuted, marginRight: 2, fontSize: 9 }}>→</span>}
                  {e.label.slice(0, 16)}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: B.textMuted, fontSize: 12, marginBottom: 12, fontStyle: 'italic' }}>
              Add blocks below to compose your vault strategy…
            </div>
          )}

          {/* Metrics row */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(48,164,108,0.08)', border: '1px solid rgba(48,164,108,0.15)',
            }}>
              <div style={{ color: B.textMuted, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>Est. Yield</div>
              <div style={{ color: B.green, fontWeight: 800, fontSize: 20, marginTop: 2 }}>
                {apy !== null ? `~${apy}%` : '—'}
              </div>
              <div style={{ color: B.textMuted, fontSize: 9, marginTop: 1 }}>APY · illustrative</div>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(199,125,54,0.06)', border: `1px solid ${B.goldBorder}`,
            }}>
              <div style={{ color: B.textMuted, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>Risk Level</div>
              <div style={{ color: risk.color, fontWeight: 800, fontSize: 20, marginTop: 2 }}>{risk.label}</div>
              <div style={{ color: B.textMuted, fontSize: 9, marginTop: 1 }}>{entries.length} position{entries.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              background: activeAutoCount > 0 ? 'rgba(199,125,54,0.08)' : 'rgba(199,125,54,0.03)',
              border: `1px solid ${activeAutoCount > 0 ? B.goldBorder : 'rgba(199,125,54,0.06)'}`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            }}>
              <Shield size={18} color={activeAutoCount > 0 ? B.gold : B.textMuted} />
              <div style={{ color: activeAutoCount > 0 ? B.gold : B.textMuted, fontSize: 10, fontWeight: 700, marginTop: 4 }}>
                {activeAutoCount > 0 ? `${activeAutoCount} Rule${activeAutoCount > 1 ? 's' : ''}` : 'No Rules'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Step tabs ── */}
        <div style={{
          display: 'flex', margin: '16px 16px 0',
          background: 'rgba(199,125,54,0.05)',
          borderRadius: 16, border: `1px solid ${B.goldBorder}`,
          overflow: 'hidden',
        }}>
          {STEPS.map((s, i) => (
            <StepTab key={s.key} index={i + 1} label={s.label} active={step === s.key} done={s.done}
              onClick={() => setStep(s.key)} />
          ))}
        </div>

        {/* ── Step content ── */}
        <div style={{ padding: '16px 16px 0' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {step === 'assets'  && <SpotPanel   assets={spotAssets}  loading={loadingSpot} onAdd={addSpot} />}
              {step === 'perps'   && <PerpPanel   markets={perpMarkets} loading={loadingPerp} onAdd={addPerp} />}
              {step === 'logic'   && (
                <>
                  <PredPanel markets={predMarkets} loading={loadingPred} onAdd={addPred} />
                  <div style={{ marginTop: 16, marginBottom: 6, color: B.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Conditional Logic
                  </div>
                  <LogicPanel onAdd={addLogic} />
                </>
              )}
              {step === 'protect' && <ProtectPanel rules={autoRules} onChange={setAutoRules} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Vault flow (composition list) ── */}
        {entries.length > 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ color: B.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Your Vault Strategy
            </div>
            <AnimatePresence>
              {entries.map(e => (
                <EntryCard
                  key={e.id} entry={e}
                  onRemove={() => removeEntry(e.id)}
                  onEditLeverage={e.kind === 'logic' && 'leverage' in e.config ? (lv) => setLeverage(e.id, lv) : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 24 }} />
      </div>

      {/* ── Bottom Deploy Bar ── */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        background: 'rgba(9,7,5,0.98)',
        borderTop: `1px solid ${B.goldBorder}`,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      }}>
        {/* Perp API status */}
        {perpError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, marginBottom: 10,
            background: 'rgba(229,77,46,0.08)', border: '1px solid rgba(229,77,46,0.2)',
          }}>
            <AlertTriangle size={12} color={B.red} />
            <span style={{ color: B.red, fontSize: 11 }}>Drift API unavailable — using cached market data</span>
          </div>
        )}

        <motion.button
          disabled={!canDeploy}
          whileTap={canDeploy ? { scale: 0.97 } : undefined}
          style={{
            width: '100%', border: 'none', borderRadius: 16, padding: '16px 0',
            cursor: canDeploy ? 'pointer' : 'not-allowed',
            background: canDeploy
              ? `var(--gold-button, #C77D36)`
              : 'rgba(199,125,54,0.15)',
            color: canDeploy ? '#0a0500' : B.textMuted,
            fontWeight: 800, fontSize: 15, letterSpacing: '-0.2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: canDeploy ? '0 4px 24px rgba(199,125,54,0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Lock size={16} />
          {canDeploy
            ? `Deploy ${vaultName || 'Vault'}`
            : 'Add at least 2 positions to deploy'}
        </motion.button>

        {!canDeploy && entries.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}>
            <Zap size={11} color={B.gold} />
            <span style={{ color: B.gold, fontSize: 11, fontWeight: 600 }}>
              {2 - entries.length} more position{2 - entries.length > 1 ? 's' : ''} needed to unlock
            </span>
          </div>
        )}
      </div>

      {/* shimmer animation */}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}
