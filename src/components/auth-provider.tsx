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

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Fetch profile
        const profileDoc = await getDoc(doc(db, "users", u.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as UserProfile;
          setProfile(profileData);
          
          if (!profileData.tuitionId && pathname !== "/setup") {
            router.push("/setup");
          }
        } else {
          setProfile(null);
          if (pathname !== "/setup") {
            router.push("/setup");
          }
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
      
      // Basic Redirect logic
      if (!u && pathname !== "/login") {
        router.push("/login");
      } else if (u && pathname === "/login") {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading ? children : (
        <div className="flex min-h-svh items-center justify-center bg-[#000000]">
           <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
