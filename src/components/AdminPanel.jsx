import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from './Header'
import { getCourses, deleteCourse, saveCourse, getCompletions } from '../utils/storage'
import { exportCourseReport, exportAllReport } from '../utils/excelExport'

function EditModal({ course, onSave, onClose }) {
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description)

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ ...course, title: title.trim(), description: description.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-dark mb-4">עריכת לומדה</h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-dark mb-1.5">שם הלומדה</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            autoFocus
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-bold text-dark mb-1.5">תיאור</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, 200))}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
          />
          <div className="text-xs text-gray-400 mt-1 text-left">{description.length}/200</div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors"
          >
            שמור
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ courseName, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="text-4xl mb-3">🗑️</div>
        <h2 className="text-lg font-bold text-dark mb-2">מחיקת לומדה</h2>
        <p className="text-sm text-gray-500 mb-6">
          האם למחוק את "<strong className="text-dark">{courseName}</strong>"?
          <br />
          <span className="text-red-500">פעולה זו אינה הפיכה ותמחק גם את כל נתוני ההשלמה.</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors"
          >
            מחק
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [completions, setCompletions] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const [editingCourse, setEditingCourse] = useState(null)
  const [deletingCourse, setDeletingCourse] = useState(null)

  const loadData = async () => {
    const [c, comp] = await Promise.all([getCourses(), getCompletions()])
    setCourses(c)
    setCompletions(comp)
  }

  useEffect(() => {
    loadData()
  }, [])

  const getCourseUrl = id => `${window.location.origin}/course/${id}`

  const handleCopyLink = async (course) => {
    try {
      await navigator.clipboard.writeText(getCourseUrl(course.id))
      setCopiedId(course.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // ignore
    }
  }

  const handleSaveEdit = async (updatedCourse) => {
    await saveCourse(updatedCourse)
    await loadData()
    setEditingCourse(null)
  }

  const handleDelete = async (course) => {
    await deleteCourse(course.id)
    await loadData()
    setDeletingCourse(null)
  }

  const handleExcel = (course) => {
    const courseCompletions = completions.filter(c => c.courseId === course.id)
    exportCourseReport(course, courseCompletions)
  }

  const handleExportAll = () => {
    exportAllReport(courses, completions)
  }

  const getCompletionCount = (courseId) => {
    return completions.filter(c => c.courseId === courseId && c.passed).length
  }

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {editingCourse && (
        <EditModal
          course={editingCourse}
          onSave={handleSaveEdit}
          onClose={() => setEditingCourse(null)}
        />
      )}
      {deletingCourse && (
        <DeleteConfirm
          courseName={deletingCourse.title}
          onConfirm={() => handleDelete(deletingCourse)}
          onClose={() => setDeletingCourse(null)}
        />
      )}

      <Header subtitle="ניהול לומדות" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-dark">לומדות קיימות</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {courses.length} לומדות · {completions.length} השלמות סה"כ
            </p>
          </div>
          <div className="flex gap-2">
            {courses.length > 0 && (
              <button
                onClick={handleExportAll}
                className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ייצוא כולל
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              לומדה חדשה
            </button>
          </div>
        </div>

        {/* Empty state */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-dark mb-2">אין לומדות עדיין</h2>
            <p className="text-gray-500 mb-6 text-sm">צור את הלומדה הראשונה שלך עכשיו</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors"
            >
              צור לומדה ראשונה
            </button>
          </div>
        ) : (
          /* Desktop table */
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    שם הלומדה
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    תיאור
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    תאריך יצירה
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    עוברים
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {courses.map(course => (
                  <tr key={course.id} className="course-row hover:bg-orange-50/30 transition-colors">
                    {/* Name */}
                    <td className="px-4 py-4">
                      <div className="font-bold text-dark text-sm">{course.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {course.sections?.length || 0} פרקים · {course.questions?.length || 0} שאלות
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-sm text-gray-500 line-clamp-1 max-w-[200px]">
                        {course.description || <span className="text-gray-300 italic">ללא תיאור</span>}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="text-sm text-gray-500">{formatDate(course.createdAt)}</div>
                    </td>

                    {/* Completions */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        ✓ {getCompletionCount(course.id)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {/* Copy link */}
                        <button
                          onClick={() => handleCopyLink(course)}
                          title="העתק קישור"
                          className={`p-2 rounded-lg text-sm transition-colors ${
                            copiedId === course.id
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-primary-light hover:text-primary'
                          }`}
                        >
                          {copiedId === course.id ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>

                        {/* Excel download */}
                        <button
                          onClick={() => handleExcel(course)}
                          title="הורד דוח Excel"
                          className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => setEditingCourse(course)}
                          title="עריכה"
                          className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeletingCourse(course)}
                          title="מחיקה"
                          className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
