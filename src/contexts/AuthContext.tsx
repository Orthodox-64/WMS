"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getIdToken
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserRole } from '@/lib/roles';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  const updateUserRole = async (user: User) => {
    try {
      // Get a fresh token
      // const token = await user.getIdToken(true);
      const idTokenResult = await user.getIdTokenResult();
      const userRole = idTokenResult.claims.role as UserRole;
      setRole(userRole || null);
    } catch (error) {
      console.error('Error getting user role:', error);
      setRole(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          await updateUserRole(user);
        } catch (error) {
          console.error('Error updating user role:', error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await updateUserRole(userCredential.user);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, role: UserRole) => {
    try {
      // Create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Wait a moment for the user to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set the user's role using the API endpoint
      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userCredential.user.uid,
          role: role,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set user role');
      }

      // Wait a moment for the role to be set
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the role in the context
      await updateUserRole(userCredential.user);
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, signIn, signOut, signUp }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 