"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { auth, User } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

type UserRole = "maker" | "checker" | "admin" | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  login: (mobileNumber: string, password: string) => Promise<void>;
  register: (username: string, mobileNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onIdTokenChanged(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Get the ID token with updated claims
          const token = await user.getIdToken(true);
          const idTokenResult = await user.getIdTokenResult();
          setUserRole(idTokenResult.claims.role as UserRole || null);
          
          // Send the token to your backend to create a session cookie
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: token }),
          });
        } catch (error) {
          console.error("Auth error:", error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (username: string, mobileNumber: string, password: string) => {
    try {
      const email = `${mobileNumber}@wms.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      await fetch("/api/auth/set-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          username,
          mobileNumber,
          role: "maker",
        }),
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const login = async (mobileNumber: string, password: string) => {
    try {
      const email = `${mobileNumber}@wms.com`;
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear the session cookie
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
