"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { UserProfile } from "@/types/user";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 1. Subscribe to auth state once on mount
  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        try {
          const profileDoc = await getDoc(doc(db, "users", u.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Handle routing and redirects reactively
  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (pathname !== "/login") {
        router.replace("/login");
      }
    } else {
      if (!profile?.tuitionId) {
        if (pathname !== "/setup") {
          router.replace("/setup");
        }
      } else {
        if (pathname === "/login" || pathname === "/setup") {
          router.replace("/");
        }
      }
    }
  }, [user, profile, loading, pathname, router]);

  // Prevent rendering protected content if we're redirecting
  const isRedirecting = 
    (!user && pathname !== "/login") ||
    (user && !profile?.tuitionId && pathname !== "/setup") ||
    (user && profile?.tuitionId && (pathname === "/login" || pathname === "/setup"));

  const shouldBlockUi = (loading && pathname !== "/login") || isRedirecting;

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {shouldBlockUi ? (
        <div className="flex min-h-svh items-center justify-center bg-[#000000]">
           <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
