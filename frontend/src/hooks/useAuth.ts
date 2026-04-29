"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser } from "@/types";
import { getUser, clearAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUser(getUser());
    setLoading(false);
  }, []);

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    clearAuth();
    router.push("/login");
  };

  return { user, loading, logout };
}