
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';

function App() {

  useEffect(() => {
    // URLから ?ref=xxx を探す
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      console.log("🔗 Invite Code Saved:", ref);
      localStorage.setItem('axis_referrer', ref);
      // URLを綺麗にする
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-orange-500/30">
      <ToastProvider>
        <RouterProvider router={router} />
        </ToastProvider>
    </div>
  );
}
export default App;