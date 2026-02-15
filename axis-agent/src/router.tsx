import { createBrowserRouter, Outlet } from "react-router-dom";
import Home from "./Home";
import { TermsPage } from "./components/terms/TermsPage";
import { AnalyticsTracker } from "./components/common/AnalyticsTracker";
import { StrategyDetailPage } from "./pages/StrategyDetailPage";

const RootLayout = () => (
  <>
    <AnalyticsTracker />
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/terms",
        element: <TermsPage />,
      },
      {
        path: "/strategy/:id", // 追加: 詳細ページのルート
        element: <StrategyDetailPage />,
      },
    ]
  }
]);

export default router;