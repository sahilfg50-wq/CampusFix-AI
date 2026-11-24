import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const newProfile = (name, email) => ({ name: name.slice(0, 80), email, role: 'student', createdAt: serverTimestamp() });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null); // the users/{uid} document (contains the role)
  const [profileError, setProfileError] = useState(null);
  const signingUp = useRef(false);

  // 1) Who is signed in?
  useEffect(
    () => onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }),
    []
  );

  // 2) Listen to this user's profile document (role, name, phone...).
  useEffect(() => {
    setProfile(null);
    setProfileError(null);
    if (!user) return undefined;
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile({ uid: user.uid, ...snap.data() });
        } else if (!signingUp.current) {
          // Account exists in Authentication but has no profile yet (e.g. created in the console): create a student profile.
          setDoc(ref, newProfile(user.displayName || user.email.split('@')[0], user.email)).catch(setProfileError);
        }
      },
      setProfileError
    );
  }, [user]);

  const signup = async (name, email, password) => {
    signingUp.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), newProfile(name.trim(), cred.user.email));
    } catch (e) {
      setProfileError(e);
      throw e;
    } finally {
      signingUp.current = false;
    }
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const saveProfile = (fields) => updateDoc(doc(db, 'users', user.uid), fields);

  return (
    <AuthContext.Provider value={{ user, profile, loading: authLoading, profileError, signup, login, logout, saveProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
