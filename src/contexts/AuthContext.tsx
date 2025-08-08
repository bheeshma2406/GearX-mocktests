"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure client-side persistence across reloads
    setPersistence(auth, browserLocalPersistence).catch(() => {
      // ignore; environment might not be a browser during hydration
    });
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function wrap<T>(fn: () => Promise<T>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? 'Authentication error');
      throw e;
    } finally {
      setLoading(false);
    }
  }

  const signIn = (email: string, password: string) =>
    wrap(() => signInWithEmailAndPassword(auth, email, password).then(() => {}));

  const signUp = (email: string, password: string) =>
    wrap(() => createUserWithEmailAndPassword(auth, email, password).then(() => {}));

  const signOut = () => wrap(() => firebaseSignOut(auth));

  const resetPassword = (email: string) =>
    wrap(() => sendPasswordResetEmail(auth, email));

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;