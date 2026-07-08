import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { AuthService } from "../features/auth/service/authService";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);


export function AuthProvider({ children, }: { children: ReactNode; }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        const { data } = await AuthService.me();
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, []);

  function login(user: User) {
    setUser(user);
  }

  async function logout() {
    try {
      await AuthService.logout();
    } finally {
      localStorage.removeItem("jwt_token");
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}