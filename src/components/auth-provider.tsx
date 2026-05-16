"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      
      // Redirect logic
      if (!u && pathname !== "/login") {
        router.push("/login");
      } else if (u && pathname === "/login") {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading ? children : (
        <div className="flex min-h-svh items-center justify-center bg-[#000000]">
           <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
