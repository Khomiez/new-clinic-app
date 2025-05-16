// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // If user is already authenticated, redirect to dashboard
        router.replace("/dashboard");
      } else {
        // If user is not authenticated, redirect to login
        router.replace("/login");
      }
    }
  }, [isAuthenticated, loading, router]);

  // Show loading screen while checking authentication
  return <LoadingScreen pageName="Application" message="Redirecting..." />;
}
