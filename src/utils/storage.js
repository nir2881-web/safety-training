import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase'

const API_KEY_STORE = 'anthropic_api_key'

// ── Courses ──────────────────────────────────────────────────────────────────

export async function getCourses() {
  const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data())
}

export async function getCourseById(id) {
  const snap = await getDoc(doc(db, 'courses', id))
  return snap.exists() ? snap.data() : null
}

export async function saveCourse(course) {
  await setDoc(doc(db, 'courses', course.id), course)
}

export async function deleteCourse(id) {
  // Delete source file from storage if it exists
  try {
    await deleteObject(ref(storage, `courseFiles/${id}`))
  } catch {
    // File may not exist, ignore
  }
  await deleteDoc(doc(db, 'courses', id))
  const snap = await getDocs(query(collection(db, 'completions'), where('courseId', '==', id)))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

// ── Course Source Files ───────────────────────────────────────────────────────

export async function uploadSourceFile(courseId, file) {
  const fileRef = ref(storage, `courseFiles/${courseId}`)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

// ── Completions ──────────────────────────────────────────────────────────────

export async function getCompletions() {
  const snap = await getDocs(collection(db, 'completions'))
  return snap.docs.map(d => d.data())
}

export async function getCompletionsByCourse(courseId) {
  const q = query(collection(db, 'completions'), where('courseId', '==', courseId))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data())
}

export async function saveCompletion(completion) {
  await addDoc(collection(db, 'completions'), completion)
}

// ── API Key (stays in localStorage — never sent to server) ───────────────────

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORE) || ''
}

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORE, key)
}
