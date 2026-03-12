/**
 * DriftVaultBuilder — Visual strategy composer for Drift ecosystem vaults.
 * Drag blocks from the palette onto the canvas, connect them, and configure
 * automation rules to deploy a Strategy Vault.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  PanResponder,
  Dimensions,
  Modal,
  Switch,
  TextInput,
} from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Plus,
  Zap,
  DollarSign,
  BarChart2,
  Target,
  GitBranch,
  Clock,
  ChevronRight,
  AlertTriangle,
  Shield,
  Sliders,
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
} from 'lucide-react-native';
import { colors } from '../../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH * 2.2;
const CANVAS_HEIGHT = SCREEN_HEIGHT * 1.6;

// ── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | 'USDC' | 'SOL'         // Spot assets
  | 'SOL_PERP' | 'BTC_PERP' | 'ETH_PERP'  // Futures
  | 'LEVERAGE'              // Leverage slider
  | 'PRED_YES' | 'PRED_NO' // Prediction market
  | 'IF' | 'THEN' | 'WAIT'; // Logic

interface BlockDef {
  type: BlockType;
  label: string;
  category: 'asset' | 'futures' | 'leverage' | 'prediction' | 'logic';
  color: string;
  bg: string;
  icon: React.ReactNode;
  description: string;
}

interface CanvasNode {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  config?: Record<string, any>;
}

interface Connection {
  from: string;
  to: string;
}

// ── Block palette definitions ─────────────────────────────────────────────

const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'USDC', label: 'USDC', category: 'asset',
    color: '#2775CA', bg: 'rgba(39,117,202,0.15)',
    icon: <DollarSign size={16} color="#2775CA" />,
    description: 'USDC spot position',
  },
  {
    type: 'SOL', label: 'SOL', category: 'asset',
    color: '#9945FF', bg: 'rgba(153,69,255,0.15)',
    icon: <Activity size={16} color="#9945FF" />,
    description: 'SOL spot position',
  },
  {
    type: 'SOL_PERP', label: 'SOL Perp', category: 'futures',
    color: '#00D4AA', bg: 'rgba(0,212,170,0.15)',
    icon: <TrendingUp size={16} color="#00D4AA" />,
    description: 'SOL perpetual futures via Drift',
  },
  {
    type: 'BTC_PERP', label: 'BTC Perp', category: 'futures',
    color: '#F7931A', bg: 'rgba(247,147,26,0.15)',
    icon: <TrendingUp size={16} color="#F7931A" />,
    description: 'BTC perpetual futures via Drift',
  },
  {
    type: 'ETH_PERP', label: 'ETH Perp', category: 'futures',
    color: '#627EEA', bg: 'rgba(98,126,234,0.15)',
    icon: <TrendingUp size={16} color="#627EEA" />,
    description: 'ETH perpetual futures via Drift',
  },
  {
    type: 'LEVERAGE', label: 'Leverage', category: 'leverage',
    color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)',
    icon: <Sliders size={16} color="#FF6B6B" />,
    description: '1× – 10× leverage multiplier',
  },
  {
    type: 'PRED_YES', label: 'Pred YES', category: 'prediction',
    color: '#10B981', bg: 'rgba(16,185,129,0.15)',
    icon: <Target size={16} color="#10B981" />,
    description: 'Prediction market YES token',
  },
  {
    type: 'PRED_NO', label: 'Pred NO', category: 'prediction',
    color: '#EF4444', bg: 'rgba(239,68,68,0.15)',
    icon: <Target size={16} color="#EF4444" />,
    description: 'Prediction market NO token',
  },
  {
    type: 'IF', label: 'IF', category: 'logic',
    color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',
    icon: <GitBranch size={16} color="#F59E0B" />,
    description: 'Conditional branch logic',
  },
  {
    type: 'THEN', label: 'THEN', category: 'logic',
    color: '#6382FF', bg: 'rgba(99,130,255,0.15)',
    icon: <ChevronRight size={16} color="#6382FF" />,
    description: 'Execute action',
  },
  {
    type: 'WAIT', label: 'WAIT', category: 'logic',
    color: '#94A3B8', bg: 'rgba(148,163,184,0.15)',
    icon: <Clock size={16} color="#94A3B8" />,
    description: 'Time-based delay / trigger',
  },
];

const CATEGORY_ORDER: Array<{ key: BlockDef['category']; label: string }> = [
  { key: 'asset',      label: 'Assets'     },
  { key: 'futures',    label: 'Futures'    },
  { key: 'leverage',   label: 'Leverage'   },
  { key: 'prediction', label: 'Prediction' },
  { key: 'logic',      label: 'Logic'      },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function defFor(type: BlockType): BlockDef {
  return BLOCK_DEFS.find((d) => d.type === type)!;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ── Sub-components ────────────────────────────────────────────────────────

interface PaletteBlockProps {
  def: BlockDef;
  onDrop: (type: BlockType) => void;
}

function PaletteBlock({ def, onDrop }: PaletteBlockProps) {
  return (
    <Pressable
      onPress={() => onDrop(def.type)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: def.bg,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: `${def.color}30`,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: `${def.color}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        {def.icon}
      </View>
      <Text style={{ color: def.color, fontWeight: '600', fontSize: 12, flex: 1 }}>
        {def.label}
      </Text>
      <Plus size={12} color={def.color} />
    </Pressable>
  );
}

interface CanvasNodeCardProps {
  node: CanvasNode;
  selected: boolean;
  onSelect: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDelete: () => void;
  onStartConnect: () => void;
  connecting: boolean;
}

function CanvasNodeCard({
  node, selected, onSelect, onDrag, onDelete, onStartConnect, connecting,
}: CanvasNodeCardProps) {
  const def = defFor(node.type);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { onSelect(); },
    onPanResponderMove: (_, gs) => { onDrag(gs.dx, gs.dy); },
    onPanResponderRelease: () => {},
  })).current;

  return (
    <View
      {...pan.panHandlers}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: 120,
        borderRadius: 12,
        backgroundColor: '#0e1421',
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? def.color : `${def.color}40`,
        shadowColor: def.color,
        shadowOpacity: selected ? 0.35 : 0.1,
        shadowRadius: 8,
        elevation: selected ? 8 : 2,
        zIndex: selected ? 10 : 1,
      }}
    >
      <LinearGradient
        colors={[`${def.color}18`, '#0e1421']}
        style={{ borderRadius: 12, padding: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: def.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 6,
            }}
          >
            {def.icon}
          </View>
          <Text style={{ color: def.color, fontWeight: '700', fontSize: 11, flex: 1 }}>
            {def.label}
          </Text>
        </View>

        {node.type === 'LEVERAGE' && (
          <Text style={{ color: '#94A3B8', fontSize: 10 }}>
            {node.config?.leverage ?? 1}×
          </Text>
        )}

        {/* Action row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Pressable
            onPress={onStartConnect}
            style={{
              backgroundColor: connecting ? `${def.color}30` : 'rgba(255,255,255,0.06)',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: connecting ? def.color : '#64748B', fontSize: 9 }}>
              {connecting ? 'linking…' : '→ link'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              borderRadius: 6,
              width: 22,
              height: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={10} color="#EF4444" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── LeverageModal ─────────────────────────────────────────────────────────

interface LeverageModalProps {
  visible: boolean;
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
}

function LeverageModal({ visible, value, onChange, onClose }: LeverageModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View
          style={{
            backgroundColor: '#0e1421',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            borderTopWidth: 1,
            borderColor: 'rgba(99,130,255,0.2)',
          }}
        >
          <Text style={{ color: '#F2E0C8', fontWeight: '700', fontSize: 18, marginBottom: 4 }}>
            Leverage
          </Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
            Set the multiplier for this position
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[1, 2, 3, 5, 7, 10].map((lv) => (
              <Pressable
                key={lv}
                onPress={() => onChange(lv)}
                style={{
                  width: 60,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: value === lv ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: value === lv ? '#FF6B6B' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: value === lv ? '#FF6B6B' : '#94A3B8',
                    fontWeight: '700',
                    fontSize: 15,
                  }}
                >
                  {lv}×
                </Text>
              </Pressable>
            ))}
          </View>

          <View
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: 'rgba(255,107,107,0.08)',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,107,107,0.15)',
            }}
          >
            <Text style={{ color: '#FF6B6B', fontSize: 12 }}>
              {value <= 2
                ? 'Low risk — suitable for conservative vaults.'
                : value <= 5
                ? 'Moderate risk — monitor liquidation levels.'
                : 'High risk — ensure Stop Loss is configured.'}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={{
              marginTop: 20,
              backgroundColor: 'rgba(99,130,255,0.15)',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(99,130,255,0.3)',
            }}
          >
            <Text style={{ color: '#6382FF', fontWeight: '700', fontSize: 15 }}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── AutomationPanel ───────────────────────────────────────────────────────

interface AutoRule {
  stopLoss: boolean;
  stopLossPercent: string;
  liquidityProtection: boolean;
  autoExit: boolean;
  autoExitCondition: string;
}

interface AutomationPanelProps {
  visible: boolean;
  rules: AutoRule;
  onChange: (r: AutoRule) => void;
  onClose: () => void;
}

function AutomationPanel({ visible, rules, onChange, onClose }: AutomationPanelProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View
          style={{
            backgroundColor: '#080f1a',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: SCREEN_HEIGHT * 0.75,
            borderTopWidth: 1,
            borderColor: 'rgba(99,130,255,0.2)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Shield size={20} color="#6382FF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#F2E0C8', fontWeight: '700', fontSize: 18, flex: 1 }}>
              Automation Rules
            </Text>
            <Pressable onPress={onClose}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Stop Loss */}
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.06)',
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.15)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TrendingDown size={16} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={{ color: '#F2E0C8', fontWeight: '600', fontSize: 14, flex: 1 }}>
                Stop Loss
              </Text>
              <Switch
                value={rules.stopLoss}
                onValueChange={(v) => onChange({ ...rules, stopLoss: v })}
                trackColor={{ false: '#1E293B', true: 'rgba(239,68,68,0.4)' }}
                thumbColor={rules.stopLoss ? '#EF4444' : '#475569'}
              />
            </View>
            {rules.stopLoss && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', fontSize: 13, marginRight: 8 }}>
                  Trigger at
                </Text>
                <TextInput
                  value={rules.stopLossPercent}
                  onChangeText={(v) => onChange({ ...rules, stopLossPercent: v })}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    color: '#EF4444',
                    fontWeight: '700',
                    width: 60,
                    fontSize: 14,
                  }}
                  placeholderTextColor="#7F1D1D"
                  placeholder="10"
                />
                <Text style={{ color: '#94A3B8', fontSize: 13, marginLeft: 8 }}>
                  % drawdown
                </Text>
              </View>
            )}
          </View>

          {/* Liquidity Protection */}
          <View
            style={{
              backgroundColor: 'rgba(16,185,129,0.06)',
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: 'rgba(16,185,129,0.15)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Shield size={16} color="#10B981" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F2E0C8', fontWeight: '600', fontSize: 14 }}>
                  Liquidity Protection
                </Text>
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                  Auto-exit if market depth drops below threshold
                </Text>
              </View>
              <Switch
                value={rules.liquidityProtection}
                onValueChange={(v) => onChange({ ...rules, liquidityProtection: v })}
                trackColor={{ false: '#1E293B', true: 'rgba(16,185,129,0.4)' }}
                thumbColor={rules.liquidityProtection ? '#10B981' : '#475569'}
              />
            </View>
          </View>

          {/* Auto Exit */}
          <View
            style={{
              backgroundColor: 'rgba(99,130,255,0.06)',
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(99,130,255,0.15)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rules.autoExit ? 10 : 0 }}>
              <Zap size={16} color="#6382FF" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F2E0C8', fontWeight: '600', fontSize: 14 }}>
                  Auto Exit
                </Text>
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                  Automatically close positions on condition
                </Text>
              </View>
              <Switch
                value={rules.autoExit}
                onValueChange={(v) => onChange({ ...rules, autoExit: v })}
                trackColor={{ false: '#1E293B', true: 'rgba(99,130,255,0.4)' }}
                thumbColor={rules.autoExit ? '#6382FF' : '#475569'}
              />
            </View>
            {rules.autoExit && (
              <TextInput
                value={rules.autoExitCondition}
                onChangeText={(v) => onChange({ ...rules, autoExitCondition: v })}
                style={{
                  backgroundColor: 'rgba(99,130,255,0.1)',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: '#CBD5E1',
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: 'rgba(99,130,255,0.2)',
                }}
                placeholderTextColor="#334155"
                placeholder="e.g. SOL price > $200"
              />
            )}
          </View>

          <Pressable
            onPress={onClose}
            style={{
              backgroundColor: 'rgba(99,130,255,0.15)',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(99,130,255,0.3)',
            }}
          >
            <Text style={{ color: '#6382FF', fontWeight: '700', fontSize: 15 }}>
              Save Rules
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Risk & summary helpers ────────────────────────────────────────────────

function computeSummary(nodes: CanvasNode[]) {
  const hasPerp = nodes.some((n) => n.type.endsWith('_PERP'));
  const hasPred = nodes.some((n) => n.type.startsWith('PRED'));
  const maxLev = nodes
    .filter((n) => n.type === 'LEVERAGE')
    .reduce((m, n) => Math.max(m, n.config?.leverage ?? 1), 1);

  let riskScore = 1;
  if (hasPerp) riskScore += 2;
  if (hasPred) riskScore += 2;
  riskScore += maxLev - 1;

  const riskLabel =
    riskScore <= 2 ? 'Low' : riskScore <= 5 ? 'Medium' : riskScore <= 8 ? 'High' : 'Very High';
  const riskColor =
    riskScore <= 2 ? '#10B981' : riskScore <= 5 ? '#F59E0B' : riskScore <= 8 ? '#EF4444' : '#DC2626';

  // Rough APY estimate (illustrative, not financial advice)
  const baseApy = 4 + nodes.length * 1.5 + (maxLev - 1) * 8 + (hasPerp ? 12 : 0) + (hasPred ? 6 : 0);
  const apyDisplay = `~${Math.min(baseApy, 180).toFixed(0)}% APY`;

  return { riskLabel, riskColor, apyDisplay };
}

// ── Main Component ────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function DriftVaultBuilder({ onBack }: Props) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showLevModal, setShowLevModal] = useState<string | null>(null); // node id
  const [showAutomation, setShowAutomation] = useState(false);
  const [autoRules, setAutoRules] = useState<AutoRule>({
    stopLoss: false,
    stopLossPercent: '10',
    liquidityProtection: false,
    autoExit: false,
    autoExitCondition: '',
  });
  const [showPalette, setShowPalette] = useState(true);

  const dragOrigins = useRef<Record<string, { ox: number; oy: number }>>({});

  const summary = computeSummary(nodes);

  // Drop block onto canvas at a staggered position
  const handleDropBlock = useCallback((type: BlockType) => {
    const existing = nodes.filter((n) => n.type === type).length;
    const id = uid();
    const newNode: CanvasNode = {
      id,
      type,
      x: 160 + existing * 20,
      y: 80 + nodes.length * 90,
      config: type === 'LEVERAGE' ? { leverage: 2 } : {},
    };
    setNodes((prev) => [...prev, newNode]);
    if (type === 'LEVERAGE') setShowLevModal(id);
  }, [nodes]);

  const handleDrag = useCallback((id: string, dx: number, dy: number) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const origin = dragOrigins.current[id];
        if (!origin) {
          dragOrigins.current[id] = { ox: n.x, oy: n.y };
          return n;
        }
        return { ...n, x: Math.max(0, origin.ox + dx), y: Math.max(0, origin.oy + dy) };
      })
    );
  }, []);

  // Reset drag origin on release — we track via onSelect (grant)
  const handleSelect = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (node) dragOrigins.current[id] = { ox: node.x, oy: node.y };
    setSelectedId(id);

    if (connectingFrom && connectingFrom !== id) {
      setConnections((prev) => {
        const exists = prev.some(
          (c) => (c.from === connectingFrom && c.to === id) || (c.from === id && c.to === connectingFrom)
        );
        if (exists) return prev;
        return [...prev, { from: connectingFrom, to: id }];
      });
      setConnectingFrom(null);
    }
  }, [nodes, connectingFrom]);

  const handleDelete = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  // ── Render ──────────────────────────────────────────────────────────────

  const activeAutoCount = [autoRules.stopLoss, autoRules.liquidityProtection, autoRules.autoExit].filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#050b14' }}>
      {/* ── Top bar ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: 'rgba(99,130,255,0.12)',
          backgroundColor: '#080f1a',
        }}
      >
        <Pressable onPress={onBack} style={{ marginRight: 12 }}>
          <X size={20} color="#64748B" />
        </Pressable>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: 'rgba(99,130,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <Zap size={14} color="#6382FF" />
        </View>
        <Text style={{ color: '#F2E0C8', fontWeight: '700', fontSize: 16, flex: 1 }}>
          Strategy Vault Builder
        </Text>
        <Pressable
          onPress={() => setShowPalette((p) => !p)}
          style={{
            backgroundColor: 'rgba(99,130,255,0.1)',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: 'rgba(99,130,255,0.2)',
          }}
        >
          <Text style={{ color: '#6382FF', fontSize: 12, fontWeight: '600' }}>
            {showPalette ? 'Hide' : 'Blocks'}
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* ── Left Palette ── */}
        {showPalette && (
          <Animated.View
            entering={FadeInRight.duration(250)}
            style={{
              width: 150,
              backgroundColor: '#080f1a',
              borderRightWidth: 1,
              borderColor: 'rgba(99,130,255,0.1)',
            }}
          >
            <ScrollView
              contentContainerStyle={{ padding: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {CATEGORY_ORDER.map(({ key, label }) => (
                <View key={key} style={{ marginBottom: 14 }}>
                  <Text
                    style={{
                      color: '#475569',
                      fontSize: 9,
                      fontWeight: '700',
                      letterSpacing: 1,
                      marginBottom: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </Text>
                  {BLOCK_DEFS.filter((d) => d.category === key).map((def) => (
                    <PaletteBlock
                      key={def.type}
                      def={def}
                      onDrop={handleDropBlock}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Canvas ── */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <ScrollView
            horizontal
            scrollEnabled={!connectingFrom}
            contentContainerStyle={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            style={{ flex: 1 }}
            showsHorizontalScrollIndicator={false}
          >
            <ScrollView
              scrollEnabled={!connectingFrom}
              contentContainerStyle={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
              showsVerticalScrollIndicator={false}
            >
              {/* Grid background */}
              <View
                style={{
                  position: 'absolute',
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  backgroundColor: '#050b14',
                }}
              >
                {/* Dot grid */}
                <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
                  {Array.from({ length: Math.ceil(CANVAS_HEIGHT / 40) }).map((_, row) =>
                    Array.from({ length: Math.ceil(CANVAS_WIDTH / 40) }).map((_, col) => (
                      <Path
                        key={`${row}-${col}`}
                        d={`M ${col * 40} ${row * 40} l 0 0`}
                        stroke="rgba(99,130,255,0.08)"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      />
                    ))
                  )}
                </Svg>
              </View>

              {/* Empty state hint */}
              {nodes.length === 0 && (
                <View
                  style={{
                    position: 'absolute',
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: 'rgba(99,130,255,0.06)',
                      borderRadius: 20,
                      padding: 28,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(99,130,255,0.1)',
                      borderStyle: 'dashed',
                    }}
                  >
                    <BarChart2 size={40} color="rgba(99,130,255,0.3)" />
                    <Text
                      style={{
                        color: 'rgba(99,130,255,0.5)',
                        fontWeight: '700',
                        fontSize: 15,
                        marginTop: 12,
                      }}
                    >
                      Start Building
                    </Text>
                    <Text
                      style={{
                        color: 'rgba(99,130,255,0.3)',
                        fontSize: 12,
                        marginTop: 6,
                        textAlign: 'center',
                        maxWidth: 180,
                      }}
                    >
                      Tap a block on the left to add it to your strategy canvas
                    </Text>
                  </View>
                </View>
              )}

              {/* SVG connections */}
              <Svg
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{ position: 'absolute' }}
                pointerEvents="none"
              >
                {connections.map((conn, i) => {
                  const from = nodes.find((n) => n.id === conn.from);
                  const to = nodes.find((n) => n.id === conn.to);
                  if (!from || !to) return null;
                  const x1 = from.x + 120;
                  const y1 = from.y + 40;
                  const x2 = to.x;
                  const y2 = to.y + 40;
                  const mx = (x1 + x2) / 2;
                  return (
                    <Path
                      key={i}
                      d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      stroke="rgba(99,130,255,0.45)"
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray="4 3"
                    />
                  );
                })}
              </Svg>

              {/* Nodes */}
              {nodes.map((node) => (
                <CanvasNodeCard
                  key={node.id}
                  node={node}
                  selected={selectedId === node.id}
                  onSelect={() => handleSelect(node.id)}
                  onDrag={(dx, dy) => handleDrag(node.id, dx, dy)}
                  onDelete={() => handleDelete(node.id)}
                  onStartConnect={() =>
                    setConnectingFrom(connectingFrom === node.id ? null : node.id)
                  }
                  connecting={connectingFrom === node.id}
                />
              ))}
            </ScrollView>
          </ScrollView>
        </View>
      </View>

      {/* ── Summary Bar ── */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={{
          backgroundColor: '#080f1a',
          borderTopWidth: 1,
          borderColor: 'rgba(99,130,255,0.12)',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        {/* Stats row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          {/* Expected APY */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(16,185,129,0.08)',
              borderRadius: 10,
              padding: 10,
              marginRight: 8,
              borderWidth: 1,
              borderColor: 'rgba(16,185,129,0.15)',
            }}
          >
            <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}>
              EST. YIELD
            </Text>
            <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 16, marginTop: 2 }}>
              {nodes.length > 0 ? summary.apyDisplay : '—'}
            </Text>
            <Text style={{ color: '#475569', fontSize: 9, marginTop: 1 }}>
              illustrative only
            </Text>
          </View>

          {/* Risk */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(239,68,68,0.06)',
              borderRadius: 10,
              padding: 10,
              marginRight: 8,
              borderWidth: 1,
              borderColor: nodes.length > 0 ? `${summary.riskColor}25` : 'rgba(239,68,68,0.08)',
            }}
          >
            <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}>
              RISK LEVEL
            </Text>
            <Text
              style={{
                color: nodes.length > 0 ? summary.riskColor : '#475569',
                fontWeight: '700',
                fontSize: 16,
                marginTop: 2,
              }}
            >
              {nodes.length > 0 ? summary.riskLabel : '—'}
            </Text>
            <Text style={{ color: '#475569', fontSize: 9, marginTop: 1 }}>
              {nodes.length} block{nodes.length !== 1 ? 's' : ''} · {connections.length} link{connections.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Automation */}
          <Pressable
            onPress={() => setShowAutomation(true)}
            style={{
              flex: 1,
              backgroundColor:
                activeAutoCount > 0 ? 'rgba(99,130,255,0.1)' : 'rgba(99,130,255,0.04)',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor:
                activeAutoCount > 0 ? 'rgba(99,130,255,0.3)' : 'rgba(99,130,255,0.1)',
              alignItems: 'center',
            }}
          >
            <Shield size={18} color={activeAutoCount > 0 ? '#6382FF' : '#334155'} />
            <Text
              style={{
                color: activeAutoCount > 0 ? '#6382FF' : '#475569',
                fontSize: 9,
                fontWeight: '700',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {activeAutoCount > 0 ? `${activeAutoCount} Rule${activeAutoCount > 1 ? 's' : ''}` : 'Rules'}
            </Text>
            <Text style={{ color: '#334155', fontSize: 8, textAlign: 'center' }}>
              Automation
            </Text>
          </Pressable>
        </View>

        {/* Deploy button */}
        <Pressable
          disabled={nodes.length < 2}
          style={{ opacity: nodes.length < 2 ? 0.45 : 1 }}
        >
          <LinearGradient
            colors={nodes.length >= 2 ? ['#1a2060', '#3a50cc', '#6382FF'] : ['#1a1a2e', '#1a1a2e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Play size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>
              {nodes.length < 2 ? 'Add at least 2 blocks to deploy' : 'Deploy Strategy Vault'}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* ── Leverage Modal ── */}
      <LeverageModal
        visible={!!showLevModal}
        value={
          showLevModal
            ? (nodes.find((n) => n.id === showLevModal)?.config?.leverage ?? 2)
            : 2
        }
        onChange={(lv) => {
          if (!showLevModal) return;
          setNodes((prev) =>
            prev.map((n) => n.id === showLevModal ? { ...n, config: { ...n.config, leverage: lv } } : n)
          );
        }}
        onClose={() => setShowLevModal(null)}
      />

      {/* ── Automation Panel ── */}
      <AutomationPanel
        visible={showAutomation}
        rules={autoRules}
        onChange={setAutoRules}
        onClose={() => setShowAutomation(false)}
      />
    </View>
  );
}
