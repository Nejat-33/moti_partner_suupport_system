import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./features/auth/pages/LoginPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import VerifyEmail from "./features/auth/pages/VerifyEmailPage";
import StaffSignup from "./features/auth/pages/StaffRegisterPage";
import CustomerSignup from "./features/auth/pages/CustomerRegistration";


function Dashboard() {
  return <h1 className="p-8 text-xl font-bold">Welcome to your secure home page!</h1>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/staff/register" element={<StaffSignup />} />
          <Route path="/customer/register" element={<CustomerSignup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}