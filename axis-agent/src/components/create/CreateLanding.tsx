import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';

interface CreateLandingProps {
  onCreate: () => void;
  onCreateVault?: () => void;
  isLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokens & Constants
// ─────────────────────────────────────────────────────────────────────────────
// 表示したい銘柄のリスト
const TOKENS = ['SOL', 'BTC', 'ETH', 'USDC', 'JUP', 'AXIS'];
const COINS_PER_TOKEN = 50; // 1銘柄あたりのコイン数
const TOTAL_COINS = TOKENS.length * COINS_PER_TOKEN; // 計270枚

// 空間の広さ（この範囲でコインが漂う）
const FIELD_SIZE = 10;
const FIELD_DEPTH = 5;

const GOLD_CORE = '#C77D36';
const GOLD_DARK = '#3D1A08';

// ─────────────────────────────────────────────────────────────────────────────
// Texture Generator (Canvas API)
// 銘柄名（SOL, BTCなど）が刻印されたコインのテクスチャを動的に生成する
// ─────────────────────────────────────────────────────────────────────────────
function createCoinTexture(symbol: string) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // ベースの金ピカの背景
  ctx.fillStyle = GOLD_CORE;
  ctx.fillRect(0, 0, size, size);

  // 外側のフチ（少し暗くして立体感を出す）
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 12;
  ctx.stroke();

  // 中央のテキスト（銘柄シンボル）
  ctx.fillStyle = GOLD_DARK;
  ctx.font = `bold ${symbol.length >= 4 ? '56' : '72'}px "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 文字を中央に描画
  ctx.fillText(symbol, size / 2, size / 2 + 5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// ─────────────────────────────────────────────────────────────────────────────
// TokenSwarm: 1銘柄分のコイン群を管理・描画するコンポーネント
// ─────────────────────────────────────────────────────────────────────────────
function TokenSwarm({ symbol }: { symbol: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 形状、マテリアル、初期位置・速度の計算
  const { geometry, materials, motionData } = useMemo(() => {
    // コインの形状（面が正面を向くようにX軸回転）
    const geo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 32);
    geo.rotateX(Math.PI / 2);

    // テクスチャの生成
    const faceTex = createCoinTexture(symbol);

    // マテリアル: [側面, 表面, 裏面]
    const sideMat = new THREE.MeshStandardMaterial({
      color: GOLD_CORE, metalness: 1.0, roughness: 0.3,
    });
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex, metalness: 0.8, roughness: 0.4,
    });
    const mats = [sideMat, faceMat, faceMat];

    // 漂うためのモーションデータ
    const data = Array.from({ length: COINS_PER_TOKEN }, () => {
      return {
        // 初期位置（X, Y, Zランダム）
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * FIELD_SIZE,
          (Math.random() - 0.5) * FIELD_SIZE,
          (Math.random() - 0.5) * FIELD_DEPTH - 2 // 奥の方へ配置
        ),
        // 移動速度（ゆっくり漂う）
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005 + 0.002, // わずかに上へ昇る速度も下げる
          (Math.random() - 0.5) * 0.005
        ),
        // 回転速度
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        // 現在の回転角度
        rotation: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
      };
    });

    return { geometry: geo, materials: mats, motionData: data };
  }, [symbol]);

  useFrame(() => {
    if (!meshRef.current) return;

    motionData.forEach((data, i) => {
      // 位置の更新
      data.pos.add(data.velocity);

      // 画面外に出たら反対側へループ（無限に漂う空間）
      if (data.pos.y > FIELD_SIZE / 2) data.pos.y = -FIELD_SIZE / 2;
      if (data.pos.y < -FIELD_SIZE / 2) data.pos.y = FIELD_SIZE / 2;
      if (data.pos.x > FIELD_SIZE / 2) data.pos.x = -FIELD_SIZE / 2;
      if (data.pos.x < -FIELD_SIZE / 2) data.pos.x = FIELD_SIZE / 2;

      // 回転の更新
      data.rotation.add(data.rotSpeed);

      // Dummyオブジェクトに適用して行列を更新
      dummy.position.copy(data.pos);
      dummy.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, materials, COINS_PER_TOKEN]}
      castShadow
      receiveShadow
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cinematic Sweep Light
// テキストの後ろを、映画のサーチライトのように光が左右に行き来する
// ─────────────────────────────────────────────────────────────────────────────
function SweepLight() {
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.getElapsedTime();
    // X軸を左右にゆっくり移動
    lightRef.current.position.x = Math.sin(t * 0.4) * 5;
    // Y軸もわずかに波打つ
    lightRef.current.position.y = Math.cos(t * 0.6) * 1.5 + 1.0;
    // 光の強さを脈打たせる
    lightRef.current.intensity = 3.0 + Math.sin(t * 2) * 1.5;
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 0, 2]}
      color="#FFE4B8" // 明るいシャンパンゴールド
      distance={10}
      decay={1.5}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene
// ─────────────────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} color="#C8D4E0" />
      {/* 全体を照らす固定のメインライト */}
      <directionalLight position={[4, 5, 4]} intensity={1.5} color="#C77D36" castShadow />
      
      {/* 動くハイライト（Your idea. Your ETF.の背後を照らす） */}
      <SweepLight />

      {/* 銘柄ごとにSwarmを生成 */}
      {TOKENS.map((token) => (
        <TokenSwarm key={token} symbol={token} />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateLanding Component
// ─────────────────────────────────────────────────────────────────────────────
export const CreateLanding = ({ onCreate, onCreateVault, isLoading }: CreateLandingProps) => {
  return (
    <div
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      style={{ background: '#050301' }}
    >
      {/* ── 3D Background ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 5.0], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <Scene />
        </Canvas>
      </div>

      {/* ── HTML Overlay ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-12 md:py-20 bg-gradient-to-b from-transparent via-[#050301]/40 to-[#050301]/90">
        <div className="flex-1 min-h-[10vh]" />

        {/* Hero Text */}
        <div className="text-center space-y-5 max-w-2xl mx-auto backdrop-blur-sm p-8 rounded-3xl">


          {/* Title - 背景の光と連動して美しく見えるように再設定 */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="font-black leading-[0.95] tracking-tighter text-white"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 7rem)' }}
          >
            Your Idea.
            <br />
            <span className="gradient-text">Your ETF.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="font-medium leading-relaxed max-w-sm mx-auto pt-2"
            style={{
              fontSize: 'clamp(0.92rem, 2.2vw, 1.1rem)',
              color: 'rgba(232, 194, 138, 0.6)',
            }}
          >
            Build, manage, and scale your on-chain index fund in seconds.
          </motion.p>
        </div>

        <div className="flex-1 min-h-[6vh]" />

        {/* CTA Buttons */}

        {/* Create Your Strategy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xs mx-auto mb-4"
        >
          <button
            onClick={onCreateVault}
            className="group relative w-full transition-all duration-200 active:scale-[0.97]"
          >
            <div
              className="absolute -inset-2 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(99,130,255,0.25) 0%, transparent 70%)' }}
            />
            <div
              className="absolute inset-0 rounded-2xl transition-transform duration-200 group-active:translate-y-[2px]"
              style={{
                transform: 'translateY(6px)',
                background: '#0f1640',
                boxShadow: '0 16px 36px rgba(0,0,0,0.75), 0 4px 10px rgba(0,0,0,0.5)',
              }}
            />
            <div
              className="relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-5 border transition-transform duration-200 group-hover:-translate-y-[3px] group-active:translate-y-[2px]"
              style={{
                background: 'linear-gradient(135deg, #1a2060, #3a50cc, #6382FF)',
                borderColor: 'rgba(150,170,255,0.22)',
                boxShadow: [
                  'inset 0 1.5px 0 rgba(150,170,255,0.3)',
                  'inset 0 -1px 0 rgba(0,0,30,0.45)',
                ].join(', '),
              }}
            >
              <span
                className="relative z-10 font-black text-xl tracking-tight select-none"
                style={{ color: '#fff' }}
              >
                Create Your Vault
              </span>
            </div>
          </button>
        </motion.div>

        {/* Create Your ETF */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xs mx-auto"
        >
          <button
            onClick={onCreate}
            disabled={isLoading}
            className="group relative w-full transition-all duration-200 active:scale-[0.97] disabled:opacity-55"
          >
            <div
              className="absolute -inset-2 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(199,125,54,0.30) 0%, transparent 70%)' }}
            />
            <div
              className="absolute inset-0 rounded-2xl transition-transform duration-200 group-active:translate-y-[2px]"
              style={{
                transform: 'translateY(6px)',
                background: '#4A230F',
                boxShadow: '0 16px 36px rgba(0,0,0,0.75), 0 4px 10px rgba(0,0,0,0.5)',
              }}
            />
            <div
              className="relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-5 border transition-transform duration-200 group-hover:-translate-y-[3px] group-active:translate-y-[2px]"
              style={{
                background: 'var(--gold-button, #c9a84c)',
                borderColor: 'rgba(244,223,190,0.22)',
                boxShadow: [
                  'inset 0 1.5px 0 rgba(244,223,190,0.45)',
                  'inset 0 -1px 0 rgba(20,8,2,0.45)',
                ].join(', '),
              }}
            >
              <div className="absolute inset-0 rounded-2xl border-t border-amber-100/20 pointer-events-none" />
              <span
                className="relative z-10 flex items-center gap-3 font-black text-xl tracking-tight select-none"
                style={{ color: '#1A0A04' }}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Create Your ETF
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                      style={{
                        background: 'rgba(26,10,4,0.80)',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.55)',
                      }}
                    >
                      <Plus strokeWidth={4} size={18} style={{ color: '#E8C28A' }} />
                    </span>
                  </>
                )}
              </span>
              <div className="absolute inset-0 w-[60%] h-full bg-gradient-to-r from-transparent via-white/22 to-transparent -translate-x-full group-hover:animate-[shine_0.9s_ease-in-out] pointer-events-none" />
            </div>
          </button>
        </motion.div>

        <div className="h-10 safe-area-bottom" />
      </div>
    </div>
  );
};