import { BasicRunPage } from "./pages/basic-run/BasicRunPage";
import { AirplanePage } from "./pages/airplane/AirplanePage";
import { HomePage } from "./pages/HomePage";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/basic-run" element={<BasicRunPage />} />
          <Route path="/airplane" element={<AirplanePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
