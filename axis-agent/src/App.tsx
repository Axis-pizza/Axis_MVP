import { RouterProvider } from "react-router-dom";
import router from "./router";
import { useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
// import {PrivyProvider} from '@privy-io/react-auth'; // 不要なので消す
// import {toSolanaWalletConnectors} from '@privy-io/react-auth/solana'; // 不要なので消す

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      console.log("🔗 Invite Code Saved:", ref);
      localStorage.setItem('axis_referrer', ref);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-orange-500/30">
      {/* PrivyProvider は Providers.tsx に任せるので、ここでは ToastProvider 以降を書く */}
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </div>
  );
}
export default App;