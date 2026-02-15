import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path, Line, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, serifFont } from '../../config/theme';

interface Slice {
  symbol: string;
  weight: number;
  color?: string;
}

interface PizzaChartProps {
  slices: Slice[];
  size?: number;
  showLabels?: boolean;
}

const SLICE_COLORS = [
  '#B8863F', // Bronze
  '#8B5E28', // Deep Bronze
  '#9F1239', // Wine
  '#15803D', // Deep Basil
  '#854D0E', // Old Gold
  '#221509', // Truffle
  '#BE123C', // Raspberry
  '#0F766E', // Deep Teal
];

export function PizzaChart({ slices, size = 200, showLabels = true }: PizzaChartProps) {
  const { paths, labels } = useMemo(() => {
    if (!slices.length) return { paths: [], labels: [] };

    const total = slices.reduce((sum, s) => sum + s.weight, 0);
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10;
    const innerRadius = radius * 0.25;

    let currentAngle = -90;
    const pathsArr: { d: string; color: string; symbol: string; weight: number }[] = [];
    const labelsArr: { x: number; y: number; symbol: string; weight: number }[] = [];

    slices.forEach((slice, i) => {
      const sliceAngle = (slice.weight / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = startAngle + sliceAngle / 2;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const midRad = (midAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      pathsArr.push({
        d,
        color: slice.color || SLICE_COLORS[i % SLICE_COLORS.length],
        symbol: slice.symbol,
        weight: slice.weight,
      });

      const labelRadius = radius + 24;
      labelsArr.push({
        x: cx + labelRadius * Math.cos(midRad),
        y: cy + labelRadius * Math.sin(midRad),
        symbol: slice.symbol,
        weight: slice.weight,
      });

      currentAngle = endAngle;
    });

    return { paths: pathsArr, labels: labelsArr };
  }, [slices, size]);

  if (!slices.length) {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(184,134,63,0.3)',
        backgroundColor: '#080503',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ color: 'rgba(184,134,63,0.5)', fontSize: 13, fontFamily: serifFont, fontStyle: 'italic' }}>
          Select Assets
        </Text>
      </View>
    );
  }

  const svgSize = size + 80;

  return (
    <View style={{ width: svgSize, height: svgSize, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={svgSize} height={svgSize} viewBox={`-40 -40 ${svgSize} ${svgSize}`}>
        <Defs>
          <SvgGradient id="crustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#B8863F" />
            <Stop offset="50%" stopColor="#D4A261" />
            <Stop offset="100%" stopColor="#221509" />
          </SvgGradient>
        </Defs>

        {/* Outer rim */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke="url(#crustGradient)"
          strokeWidth={1}
          strokeOpacity={0.8}
        />

        {/* Background base */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          fill="#140E08"
          opacity={0.5}
        />

        {/* Slices */}
        {paths.map((path) => (
          <Path
            key={path.symbol}
            d={path.d}
            fill={path.color}
            stroke="#080503"
            strokeWidth={1.5}
            opacity={0.9}
          />
        ))}

        {/* Center hole */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 * 0.22}
          fill="#080503"
          stroke="#B8863F"
          strokeWidth={0.5}
          strokeOpacity={0.3}
        />

        {/* Labels */}
        {showLabels && labels.map((label) => {
          const angle = Math.atan2(label.y - size / 2, label.x - size / 2);
          const lineStartX = size / 2 + (size / 2 - 10) * Math.cos(angle);
          const lineStartY = size / 2 + (size / 2 - 10) * Math.sin(angle);

          return (
            <G key={label.symbol}>
              <Line
                x1={lineStartX}
                y1={lineStartY}
                x2={label.x}
                y2={label.y}
                stroke="#B8863F"
                strokeWidth={0.5}
                strokeOpacity={0.3}
              />
            </G>
          );
        })}
      </Svg>

      {/* Native Text labels (SVG text rendering is limited in RN) */}
      {showLabels && labels.map((label) => (
        <View
          key={label.symbol}
          style={{
            position: 'absolute',
            left: label.x + 40 - 24,
            top: label.y + 40 - 10,
            width: 48,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#E7E5E4', fontFamily: serifFont }}>
            {label.symbol}
          </Text>
          <Text style={{ fontSize: 10, color: '#B8863F', fontFamily: serifFont }}>
            {label.weight}%
          </Text>
        </View>
      ))}
    </View>
  );
}
