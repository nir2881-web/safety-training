const COURSES_KEY = 'lms_courses'
const COMPLETIONS_KEY = 'lms_completions'
const API_KEY_STORE = 'anthropic_api_key'

export function getCourses() {
  try {
    return JSON.parse(localStorage.getItem(COURSES_KEY) || '[]')
  } catch {
    return []
  }
}

export function getCourseById(id) {
  return getCourses().find(c => c.id === id) || null
}

export function saveCourse(course) {
  const courses = getCourses()
  const idx = courses.findIndex(c => c.id === course.id)
  if (idx >= 0) {
    courses[idx] = course
  } else {
    courses.unshift(course)
  }
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses))
}

export function deleteCourse(id) {
  const courses = getCourses().filter(c => c.id !== id)
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses))
  const completions = getCompletions().filter(c => c.courseId !== id)
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions))
}

export function getCompletions() {
  try {
    return JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || '[]')
  } catch {
    return []
  }
}

export function getCompletionsByCourse(courseId) {
  return getCompletions().filter(c => c.courseId === courseId)
}

export function saveCompletion(completion) {
  const completions = getCompletions()
  completions.push(completion)
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions))
}

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORE) || ''
}

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORE, key)
}
