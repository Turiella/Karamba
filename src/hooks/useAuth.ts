"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider, User } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u: User | null) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Auth error");
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in error");
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign out error");
    }
  };

  return { user, uid: user?.uid, loading, error, signInWithGoogle, signOut } as const;
}
