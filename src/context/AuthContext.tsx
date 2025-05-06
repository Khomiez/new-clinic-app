"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/redux/hooks/useAppDispatch";
import { setAdminData } from "@/redux/features/admin/adminSlice";
import { fetchClinics } from "@/redux/features/clinics/clinicsSlice";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const dispatch = useAppDispatch();

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // You would need to implement this API endpoint
        const response = await fetch("/api/auth/status");
        const data = await response.json();

        setIsAuthenticated(data.isAuthenticated);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      // Login successful - get the current admin details
      const adminResponse = await fetch("/api/auth/me");
      if (!adminResponse.ok) {
        const errorData = await adminResponse.json();
        throw new Error(errorData.error || "Failed to fetch admin data");
      }

      const adminData = await adminResponse.json();

      dispatch(setAdminData(adminData));

      if (adminData._id) {
        dispatch(fetchClinics(adminData._id.toString()));
      }

      setIsAuthenticated(true);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };


  const logout = async () => {
    setLoading(true);

    try {
      // You would need to implement this API endpoint
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      setIsAuthenticated(false);
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
