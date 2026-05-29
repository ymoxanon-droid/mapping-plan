import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import InputPage from "./pages/InputPage";
import PresentationsPage from "./pages/PresentationsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/input" element={<InputPage />} />
      <Route path="/presentations" element={<PresentationsPage />} />
    </Routes>
  );
}
