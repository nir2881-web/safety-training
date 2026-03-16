import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBVYFyWx2xqL28tNe5PB4eFQspjD9ux5EI",
  authDomain: "safetyon-lms.firebaseapp.com",
  projectId: "safetyon-lms",
  storageBucket: "safetyon-lms.firebasestorage.app",
  messagingSenderId: "452788640115",
  appId: "1:452788640115:web:367e1cb1e26da38994cd06"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
