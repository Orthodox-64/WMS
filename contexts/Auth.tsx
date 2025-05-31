"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from "@/components/ui/use-toast";

type UserRole = "maker" | "checker" | "admin" | null;

interface User {
  id: string;
  username: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: string;
}

interface UserWithPassword extends User {
  password: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (username: string, phoneNumber: string, password: string, role: UserRole) => Promise<void>;
  login: (phoneNumber: string, password: string, username: string) => Promise<void>;
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

  const validateUsername = (username: string): boolean => {
    // Only alphabets and spaces allowed, no special characters or numbers
    const usernameRegex = /^[A-Za-z\s]+$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string): boolean => {
    // Minimum 8 characters, first letter capital, must contain special character and alphanumeric
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
    return passwordRegex.test(password);
  };

  const register = async (username: string, phoneNumber: string, password: string, role: UserRole) => {
    try {
      if (!role || (role !== "maker" && role !== "checker")) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Please select a valid role (maker or checker).",
        });
        return;
      }

      // Validate username format
      if (!validateUsername(username)) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Username can only contain alphabets and spaces. No special characters or numbers allowed.",
        });
        return;
      }

      // Validate password format
      if (!validatePassword(password)) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Password must be at least 8 characters long, start with a capital letter, and contain at least one special character and one number.",
        });
        return;
      }

      // Check if username is already taken
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Username is already taken. Please choose a different username.",
        });
        return;
      }

      // Check if phone number is already registered
      const phoneQuery = query(
        collection(db, 'users'),
        where('phoneNumber', '==', phoneNumber)
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      
      if (!phoneSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: "Phone number is already registered. Please use a different phone number.",
        });
        return;
      }

      // Create new user document
      const userRef = doc(collection(db, 'users'));
      const newUser: UserWithPassword = {
        id: userRef.id,
        username,
        phoneNumber,
        password, // Note: In a production environment, you should hash the password
        role,
        createdAt: new Date().toISOString()
      };

      await setDoc(userRef, newUser);
      
      // Store user in local storage (excluding password)
      const { password: _, ...userWithoutPassword } = newUser;
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created successfully.",
      });
      
      router.push("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: "An error occurred during registration. Please try again.",
      });
    }
  };

  const login = async (phoneNumber: string, password: string, username: string) => {
    try {
      // Validate username format
      if (!validateUsername(username)) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid username format. Username can only contain alphabets and spaces.",
        });
        return;
      }

      // Validate password format
      if (!validatePassword(password)) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid password format. Please check your password requirements.",
        });
        return;
      }

      // First check if username exists
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (usernameSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Username not found. Please check your username and try again.",
        });
        return;
      }

      // Then check phone number and password
      const userQuery = query(
        collection(db, 'users'),
        where('phoneNumber', '==', phoneNumber)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Phone number not found. Please check your phone number and try again.",
        });
        return;
      }

      const userData = userSnapshot.docs[0].data() as UserWithPassword;
      
      if (userData.password !== password) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Incorrect password. Please try again.",
        });
        return;
      }

      // Verify that the username matches the phone number
      if (userData.username !== username) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Username does not match the phone number. Please check your details and try again.",
        });
        return;
      }

      // Store user in local storage (excluding password)
      const { password: _, ...userWithoutPassword } = userData;
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
      });
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('user');
      setUser(null);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred during logout. Please try again.",
      });
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
