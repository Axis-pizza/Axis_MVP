
import { RouterProvider } from "react-router-dom";
import router from "./router";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-orange-500/30">
        <RouterProvider router={router} />
    </div>
  );
}
export default App;