import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import LocationDetail from "./pages/LocationDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BusinessDetail from "./pages/BusinessDetail";
import LocationCameras from "./pages/LocationCameras";
import CameraMonitor from "./pages/CameraMonitor";

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/locations/:id" element={<LocationDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/cameras" element={<CameraMonitor />} />
          <Route path="/dashboard/businesses/:id" element={<BusinessDetail />} />
          <Route path="/dashboard/locations/:id/cameras" element={<LocationCameras />} />
        </Route>
      </Routes>
    </>
  );
}
