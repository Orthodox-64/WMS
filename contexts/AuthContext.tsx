"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type UserRole = "maker" | "checker" | "admin" | null;

interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (username: string, email: string, password: string, role: UserRole) => Promise<void>;
  login: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (username: string, email: string, password: string, role: UserRole) => {
    try {
      // Check if username is already taken
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        throw new Error("Username is already taken");
      }

      // Create new user document
      const userRef = doc(collection(db, 'users'));
      const newUser: User = {
        id: userRef.id,
        username,
        email,
        role,
        createdAt: new Date().toISOString()
      };

      await setDoc(userRef, newUser);
      
      // Store user in local storage
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);

      router.push("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const login = async (username: string, email: string, password: string) => {
    try {
      // For demo purposes, allow login with any username if it exists
      // In production, you'd want to implement proper password hashing and verification
      const userQuery = query(
        collection(db, 'users'),
        where('username', '==', username)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error("Username not found. Please check your username or register a new account.");
      }

      const userData = userSnapshot.docs[0].data() as User;
      
      // Basic validation - in production, implement proper password verification
      if (!password || password.length < 3) {
        throw new Error("Please enter a valid password");
      }
      
      // Store user in local storage
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('user');
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    register,
    login,
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