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

type UserRole = 'maker' | 'checker' | 'admin' | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  login: (mobileNumber: string, password: string) => Promise<void>;
  register: (username: string, mobileNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { useAuth };

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useFirebaseAuth();
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const updateUserRole = async () => {
      if (user) {
        const token = await user.getIdTokenResult();
        const role = token.claims.role as UserRole;
        setUserRole(role || null);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    };

    if (!authLoading) {
      updateUserRole();
    }
  }, [user, authLoading]);

  const register = async (username: string, mobileNumber: string, password: string) => {
    try {
      // Convert mobile number to email format for authentication
      const email = `${mobileNumber}@wms.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Set up user profile and custom claims
      const { user } = userCredential;
      await fetch('/api/auth/set-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          username,
          mobileNumber,
          role: 'maker', // Default role, can be changed by admin
        }),
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const login = async (mobileNumber: string, password: string) => {
    try {
      // Convert mobile number to email format
      const email = `${mobileNumber}@wms.com`;
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    loading: loading || authLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
  const register = async (username: string, mobileNumber: string, password: string) => {
    try {
      // First, create the user with email (using mobile as email)
      const userCredential = await signInWithEmailAndPassword(
        auth,
        `${mobileNumber}@wms.com`,
        password
      );

      // Set custom claims using a Cloud Function (you'll need to implement this)
      const user = userCredential.user;
      await user.getIdToken(true);
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };
  const register = async (username: string, mobileNumber: string, password: string) => {
    try {
      // Convert mobile number to email format for authentication
      const email = `${mobileNumber}@wms.com`;
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Set up user profile and custom claims
      const { user } = userCredential;
      await fetch('/api/auth/set-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          username,
          mobileNumber,
          role: 'maker', // Default role, can be changed by admin
        }),
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const login = async (mobileNumber: string, password: string) => {
    try {
      // Convert mobile number to email format
      const email = `${mobileNumber}@wms.com`;
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}