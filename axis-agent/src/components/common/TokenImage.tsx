import { useState } from 'react';

// 画像読み込みエラー時のフォールバック用URL
const FALLBACK_IMAGE = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";

export const TokenImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_IMAGE);

  return (
    <img 
      src={imgSrc} 
      alt={alt}
      className={className}
      onError={() => setImgSrc(FALLBACK_IMAGE)}
      loading="lazy" // 遅延読み込みで初期表示を高速化
    />
  );
};