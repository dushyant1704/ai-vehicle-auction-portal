import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useTheme } from "./context/ThemeContext";

// Pages
import Home from "./pages/Home";
import Auctions from "./pages/Auctions";
import VehicleDetails from "./pages/VehicleDetails";
import MyBids from "./pages/MyBids";
import Profile from "./pages/Profile";
import AddVehicle from "./pages/AddVehicle";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

// Global Components
import Navbar from "./components/Navbar";
import AIAssistantWidget from "./components/AIAssistantWidget";

// Auth Context
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function AppLayout() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const location = useLocation();
  const hiddenNavRoutes = ["/dashboard"];
  const showNavbar = !hiddenNavRoutes.some(r => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.4)'
              : '0 4px 24px rgba(0,0,0,0.1)',
          },
          success: {
            iconTheme: { primary: '#6366f1', secondary: '#fff' },
          },
        }}
      />

      {showNavbar && <Navbar />}

      <main className="w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auctions" element={<Auctions />} />
          <Route path="/add-vehicle" element={<AddVehicle />} />
          <Route path="/vehicle/:id" element={<VehicleDetails />} />
          <Route path="/my-bids" element={<MyBids />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

      {/* Role-Based RAG AI Assistant */}
      <AIAssistantWidget />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

