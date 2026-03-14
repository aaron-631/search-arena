import { initializeApp }               from 'firebase/app';
import { getFirestore }                from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            "AIzaSyCRrQxkQAejJgd6JuMYc_37N_eXsXov5CI",
  authDomain:        "search-arena.firebaseapp.com",
  projectId:         "search-arena",
  storageBucket:     "search-arena.firebasestorage.app",
  messagingSenderId: "1067469662585",
  appId:             "1:1067469662585:web:2946697ab29222abfa67a8"
};

const app              = initializeApp(firebaseConfig);
export const db        = getFirestore(app);
export const auth      = getAuth(app);
export const provider  = new GoogleAuthProvider();