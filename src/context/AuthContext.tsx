// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/redux/hooks/useAppDispatch";
import { setAdminData, clearAdmin } from "@/redux/features/admin/adminSlice";
import { clearClinics } from "@/redux/features/clinics/clinicsSlice";
import { clearPatients } from "@/redux/features/patients/patientsSlice";

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

  // Check auth status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("/api/auth/status");
        if (!response.ok) {
          throw new Error("Failed to check authentication status");
        }
        
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);
        
        // If authenticated, fetch admin data
        if (data.isAuthenticated) {
          const adminResponse = await fetch("/api/auth/me");
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            dispatch(setAdminData(adminData.admin || adminData));
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [dispatch]);

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
      dispatch(setAdminData(adminData.admin || adminData));

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
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // Clear Redux state
      dispatch(clearAdmin());
      dispatch(clearClinics());
      dispatch(clearPatients());
      
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