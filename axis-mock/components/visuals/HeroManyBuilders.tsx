"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Builder = { id: string; pfpUrl: string; x: number; y: number; z?: number };
type Token = { id: string; logoUrl: string };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Orbiter = {
  key: string;
  token: Token;
  builderIndex: number;
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
  zAmp: number;
  wobble: number;
};

export default function HeroManyBuilders({
  builders,
  tokens,
}: {
  builders?: Builder[];
  tokens?: Token[];
}) {
  const reduced = usePrefersReducedMotion();

  // --- data（仮。あなたの実データに差し替えOK） ---
  const BUILDERS_RAW: Builder[] =
    builders ??
    [
      { id: "b1", pfpUrl: "/pfp/1.png", x: -150, y: 0 },
      { id: "b2", pfpUrl: "/pfp/2.png", x: 150, y: 10 },
      { id: "b3", pfpUrl: "/pfp/3.png", x: -30, y: 150 },
    ];

  const TOKENS: Token[] =
    tokens ??
    [
      { id: "sol", logoUrl: "/asset/solana.png" },
      { id: "jup", logoUrl: "/asset/JLP.png" },
      { id: "ray", logoUrl: "/asset/Rydium.png" },
      { id: "sns", logoUrl: "/asset/sns.png" },
      { id: "bonk", logoUrl: "/asset/bonk.jpg" },
      { id: "jito", logoUrl: "/asset/jitoSOL.png" },
      { id: "kamino", logoUrl: "/asset/kamino.png" },
      { id: "meteora", logoUrl: "/asset/meteora.png" },
    ];

  // bounds
  const ref = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ w: 800, h: 800 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      const r = ref.current!.getBoundingClientRect();
      setBounds({ w: r.width, h: r.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // PFPに奥行きを持たせる（手前/奥が分かる）
  const BUILDERS = useMemo(() => {
    const DEFAULT_Z = [70, -30, 25, -60, 45];
    return BUILDERS_RAW.map((b, i) => ({
      ...b,
      z: b.z ?? DEFAULT_Z[i % DEFAULT_Z.length],
    }));
  }, [BUILDERS_RAW]);

  // ---- tuning（ここだけ触れば雰囲気決まる）----
  const TOKEN_COUNT = reduced ? 0 : 18; // 浮遊粒の数（※重複禁止なのでTOKENS数が上限）
  const TOKEN_D = 46; // ロゴコンテナの大きさ（見やすさ）
  const TOKEN_ICON = 28;

  // 速度（小さいほどモダンで静か）
  const SPEED_MIN = 0.16;
  const SPEED_MAX = 0.32;

  // 3D感（強すぎると酔う）
  const Z_AMP_MIN = 18;
  const Z_AMP_MAX = 36;

  // 全体の“空間ドリフト”（無い方がいいなら false）
  const ENABLE_SCENE_DRIFT = true;
  // -----------------------------------------------

  // ① 重複しない token を作る（画面に出すぶんだけ）
  const uniqueTokens = useMemo(() => {
    const map = new Map<string, Token>();
    for (const t of TOKENS) map.set(t.id, t); // id重複も排除
    return shuffle(Array.from(map.values()));
  }, [TOKENS]);

  // ② 表示数は、ユニーク token 数を超えない
  const EFFECTIVE_TOKEN_COUNT = useMemo(() => {
    return Math.min(TOKEN_COUNT, uniqueTokens.length);
  }, [TOKEN_COUNT, uniqueTokens.length]);

  // Orbiters config
  const orbiters = useMemo<Orbiter[]>(() => {
    const out: Orbiter[] = [];
    const size = Math.min(bounds.w, bounds.h);

    for (let i = 0; i < EFFECTIVE_TOKEN_COUNT; i++) {
      const token = uniqueTokens[i]; // ★重複なし
      const builderIndex = i % Math.max(1, BUILDERS.length);

      const radius = size * (0.11 + Math.random() * 0.06);
      const speed = lerp(SPEED_MIN, SPEED_MAX, Math.random());
      const phase = Math.random() * Math.PI * 2;

      out.push({
        key: `o-${i}-${token.id}`,
        token,
        builderIndex,
        radius,
        speed,
        phase,
        tilt: Math.random() * Math.PI * 2,
        zAmp: lerp(Z_AMP_MIN, Z_AMP_MAX, Math.random()),
        wobble: size * (0.005 + Math.random() * 0.01),
      });
    }
    return out;
  }, [bounds.w, bounds.h, EFFECTIVE_TOKEN_COUNT, uniqueTokens, BUILDERS.length]);

  // DOM refs
  const tokenElsRef = useRef(new Map<string, HTMLDivElement>());
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const orbitersRef = useRef<Orbiter[]>(orbiters);

  useEffect(() => {
    orbitersRef.current = orbiters;
  }, [orbiters]);

  // animation loop
  useEffect(() => {
    if (reduced) return;

    let raf = 0;
    const start = performance.now();

    const tick = () => {
      const t = (performance.now() - start) / 1000;

      // ゆっくりしたシーン全体の傾き（空間感）
      if (ENABLE_SCENE_DRIFT && sceneRef.current) {
        const rx = Math.sin(t * 0.05) * 6; // deg
        const ry = Math.cos(t * 0.04) * 10;
        sceneRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      }

      for (const o of orbitersRef.current) {
        const el = tokenElsRef.current.get(o.key);
        if (!el) continue;

        const b = BUILDERS[o.builderIndex];
        if (!b) continue;

        const bx = b.x;
        const by = b.y;
        const bz = b.z ?? 0;

        // 3D orbit
        const a = o.phase + t * o.speed;
        const ox = Math.cos(a) * o.radius;
        const oy = Math.sin(a) * o.radius * 0.72;

        const zLocal = Math.sin(a + o.tilt) * o.zAmp; // -..+
        const z = bz + zLocal;

        // 深度で見え方調整（手前ほどくっきり/大きい）
        const depth = (zLocal + o.zAmp) / (2 * o.zAmp); // 0..1
        const scale = lerp(0.88, 1.18, depth);
        const opacity = lerp(0.4, 1.0, depth);
        const blur = lerp(1.4, 0.0, depth);
        const brightness = lerp(0.92, 1.1, depth);

        const x = bx + ox;
        const y = by + oy + Math.sin(a * 2.0) * o.wobble;

        // 手前が上に来るように
        el.style.zIndex = `${Math.round(3000 + z)}`;
        el.style.opacity = `${opacity}`;
        el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`;
        el.style.filter = `blur(${blur}px) brightness(${brightness}) drop-shadow(0 0 ${lerp(
          10,
          20,
          depth
        )}px rgba(20,241,149,0.08))`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, BUILDERS, ENABLE_SCENE_DRIFT]);

  // --- render ---
  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none">
      {/* 背景fog（PFPが浮く問題の保険。いらなければ丸ごと削除OK） */}
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(20,241,149,0.10),transparent_60%)] blur-2xl" />
        <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_40%,rgba(0,180,255,0.08),transparent_55%)] blur-3xl" />
      </div>

      {/* perspective */}
      <div className="absolute inset-0" style={{ perspective: 950 }}>
        <div className="absolute left-1/2 top-1/2" style={{ transformStyle: "preserve-3d" }}>
          <div ref={sceneRef} style={{ transformStyle: "preserve-3d" }}>
            {/* PFP */}
            {BUILDERS.map((b) => {
              const bz = b.z ?? 0;
              const depthNorm = clamp01((bz + 90) / 180);
              const s = lerp(0.92, 1.08, depthNorm);
              const o = lerp(0.75, 1.0, depthNorm);
              const blur = lerp(1.0, 0.0, depthNorm);

              return (
                <div
                  key={b.id}
                  className="absolute"
                  style={{
                    transform: `translate3d(${b.x}px, ${b.y}px, ${bz}px) scale(${s})`,
                    transformStyle: "preserve-3d",
                    opacity: o,
                    filter: `blur(${blur}px)`,
                    zIndex: `${4000 + Math.round(bz)}`,
                  }}
                >
                  {/* halo（静か） */}
                  {!reduced && (
                    <div className="absolute -inset-7 rounded-full border border-white/10 shadow-[0_0_70px_rgba(20,241,149,0.08)]" />
                  )}

                  <div className="relative h-[62px] w-[62px] overflow-hidden rounded-full border border-white/12 bg-black/35 shadow-[0_0_44px_rgba(20,241,149,0.08)] backdrop-blur">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.pfpUrl} alt="" className="h-full w-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_60%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_80%,rgba(20,241,149,0.10),transparent_55%)] mix-blend-screen" />
                  </div>
                </div>
              );
            })}

            {/* Tokens（PFP周りに3D浮遊 / 重複なし） */}
            {!reduced &&
              orbiters.map((o) => (
                <div
                  key={o.key}
                  ref={(el) => {
                    if (!el) tokenElsRef.current.delete(o.key);
                    else tokenElsRef.current.set(o.key, el);
                  }}
                  className="absolute will-change-transform"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className="grid place-items-center overflow-hidden rounded-full border border-white/10 bg-black/40 shadow-[0_0_28px_rgba(20,241,149,0.08)] backdrop-blur"
                    style={{ width: TOKEN_D, height: TOKEN_D, padding: 8 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={o.token.logoUrl}
                      alt=""
                      className="rounded-full object-contain"
                      style={{ width: TOKEN_ICON, height: TOKEN_ICON }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 可読性マスク */}
      
    </div>
  );
}
