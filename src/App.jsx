import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CreateCourse from './components/CreateCourse'
import AdminPanel from './components/AdminPanel'
import CoursePlayer from './components/CoursePlayer'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateCourse />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/course/:id" element={<CoursePlayer />} />
        <Route path="*" element={<CreateCourse />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
