import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";

interface RichChartProps {
  data: any[];
  isPositive: boolean;
}

/** 値を “緩やか” にする：EMA（指数移動平均） */
function emaSmooth(values: number[], alpha = 0.25) {
  // alpha: 0〜1（小さいほどなめらか）
  if (values.length === 0) return [];
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out[i] = alpha * values[i] + (1 - alpha) * out[i - 1];
  }
  return out;
}

/** 入力を { time, value } に正規化して安全にする */
function normalizeLineData(raw: any[]) {
  if (!raw || raw.length === 0) return [];

  const normalized = raw
    .map((d) => {
      const time = d?.time as UTCTimestamp | number | undefined;

      // line向け value が無いケースを吸収（close / price / y など）
      const value =
        typeof d?.value === "number"
          ? d.value
          : typeof d?.close === "number"
          ? d.close
          : typeof d?.price === "number"
          ? d.price
          : typeof d?.y === "number"
          ? d.y
          : undefined;

      if (time == null || typeof value !== "number" || Number.isNaN(value)) {
        return null;
      }

      return { time: time as UTCTimestamp, value };
    })
    .filter(Boolean) as { time: UTCTimestamp; value: number }[];

  // timeでソート & 重複time削除
  normalized.sort((a, b) => (a.time as number) - (b.time as number));
  const deduped = normalized.filter(
    (v, i, arr) => i === 0 || v.time !== arr[i - 1].time
  );

  return deduped;
}

export const RichChart = ({ data, isPositive }: RichChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // 正規化 + EMAで滑らかにしたデータを作る
  const smoothedData = useMemo(() => {
    const base = normalizeLineData(data);
    if (base.length <= 2) return base;

    const values = base.map((d) => d.value);
    const smoothValues = emaSmooth(values, 0.18); // ← ここで “緩やかさ” 調整（0.1〜0.3おすすめ）

    return base.map((d, i) => ({ time: d.time, value: smoothValues[i] }));
  }, [data]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart: IChartApi = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#78716C",
        fontFamily: "'Times New Roman', Times, serif",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.06)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.12)",
        timeVisible: true,
      },
      localization: {
        locale: "en-US",
        dateFormat: "yyyy/MM/dd",
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.12)" },
    });

    const mainColor = isPositive ? "#10B981" : "#EF4444";

    /**
     * ✅ グラデを強くするコツ：
     * 1) topColor の alpha を上げる
     * 2) “下にもう1枚” area を重ねる（より濃い/広いグラデに見える）
     */
    const areaUnder = chart.addAreaSeries({
      lineColor: "rgba(0,0,0,0)", // 下のlayerは線いらない
      topColor: isPositive
        ? "rgba(16, 185, 129, 0.38)"
        : "rgba(239, 68, 68, 0.38)",
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 1,
    });

    const areaMain = chart.addAreaSeries({
      lineColor: mainColor,
      topColor: isPositive
        ? "rgba(16, 185, 129, 0.22)"
        : "rgba(239, 68, 68, 0.22)",
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2.5,
    });

    // データ反映
    if (smoothedData.length > 0) {
      areaUnder.setData(smoothedData);
      areaMain.setData(smoothedData);
      chart.timeScale().fitContent();
    }

    // ✅ resizeはResizeObserverが安定
    const ro = new ResizeObserver(() => {
      if (!chartContainerRef.current) return;
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [smoothedData, isPositive]);

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="w-full h-[300px]" />
    </div>
  );
};
