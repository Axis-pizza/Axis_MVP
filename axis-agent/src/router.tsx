
import { createBrowserRouter } from "react-router-dom";
import Home from "./Home";
import { TermsPage } from "./components/terms/TermsPage";

// Define your routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/terms",
    element: <TermsPage />,
  },
]);

export default router;

  