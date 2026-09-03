import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import LocationDetail from "./pages/LocationDetail";

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/locations/:id" element={<LocationDetail />} />
      </Routes>
    </>
  );
}
