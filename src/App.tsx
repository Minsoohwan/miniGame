import { BasicRunPage } from "./pages/basic-run/BasicRunPage";
import { AirplanePage } from "./pages/airplane/AirplanePage";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/basic-run" element={<BasicRunPage />} />
          <Route path="/airplane" element={<AirplanePage />} />
          <Route path="*" element={<Navigate to="/basic-run" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
