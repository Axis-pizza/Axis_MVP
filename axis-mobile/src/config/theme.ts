import { Platform } from 'react-native';

export const colors = {
  // Core backgrounds
  background: '#080503',        // Web: bg-dark (near-void black)
  backgroundSecondary: '#140E08', // Web: bg-secondary
  backgroundTertiary: '#221509', // Web: bg-tertiary
  surface: '#140E08',
  surfaceLight: '#221509',

  // Brand gold
  accent: '#B8863F',            // Web: brand-primary (metallic gold)
  accentLight: '#D4A261',       // Web: brand-secondary
  accentDark: '#6B4420',        // Web: gold-900
  accentBronze: '#8B5E28',      // Web: gold-700
  accentHighlight: '#E8C890',   // Web: gold-100

  // Text
  text: '#F2E0C8',             // Web: text-primary (warm cream)
  textSecondary: '#B89860',     // Web: text-secondary
  textMuted: '#7A5A30',         // Web: text-muted
  textDim: '#7A5A30',

  // Borders
  border: 'rgba(184, 134, 63, 0.15)',  // gold-tinted borders
  borderLight: 'rgba(184, 134, 63, 0.08)',

  // Status
  positive: '#10B981',
  negative: '#EF4444',
  info: '#3B82F6',

  // Strategy types
  aggressive: '#EF4444',
  balanced: '#F59E0B',
  conservative: '#3B82F6',
};

// Serif font family for luxury feel (matching Web's Times New Roman)
export const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';
