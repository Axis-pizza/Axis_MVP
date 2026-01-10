"use client";

import { useState, useEffect, ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly コンポーネント
 * 
 * クライアントサイドでのみレンダリングされるコンポーネントをラップします。
 * SSRでのHydration Errorやサーバー/クライアント間の不整合を防ぎます。
 * ResizeObserverを使用するコンポーネント（チャートなど）に特に有効です。
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
