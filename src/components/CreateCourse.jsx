import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import Header from './Header'
import { extractText } from '../utils/fileParser'
import { generateCourse } from '../utils/aiService'
import { saveCourse, getApiKey, saveApiKey, uploadSourceFile } from '../utils/storage'

const ALLOWED_EXTS = ['pdf', 'docx', 'pptx', 'txt']

export default function CreateCourse() {
  const navigate = useNavigate()
  const fileInputRef = useRef()

  const [apiKey, setApiKey] = useState(getApiKey)
  const [showKey, setShowKey] = useState(false)
  const [file, setFile] = useState(null)
  const [courseName, setCourseName] = useState('')
  const [description, setDescription] = useState('')
  const [allowDownload, setAllowDownload] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState('')
  const [showServerTips, setShowServerTips] = useState(false)
  const [createdCourse, setCreatedCourse] = useState(null)
  const [fileUploadFailed, setFileUploadFailed] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleFileSelect = selectedFile => {
    const ext = selectedFile.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      setError('יש להעלות קובץ PDF, DOCX, PPTX או TXT')
      return
    }
    setFile(selectedFile)
    setError('')
    if (!courseName) {
      setCourseName(selectedFile.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const handleCreate = async () => {
    if (!apiKey.trim()) { setError('אנא הכנס מפתח API של Google Gemini'); return }
    if (!apiKey.startsWith('AIza')) { setError('המפתח אמור להתחיל ב- AIza'); return }
    if (!file) { setError('אנא בחר קובץ להעלאה'); return }
    if (!courseName.trim()) { setError('אנא הכנס שם ללומדה'); return }

    setLoading(true)
    setLoadingStep(1)
    setError('')
    saveApiKey(apiKey.trim())

    try {
      const fileData = await extractText(file)
      setLoadingStep(2)

      const courseId = uuidv4()
      const aiResult = await generateCourse(apiKey.trim(), fileData)
      setLoadingStep(3)

      let sourceFileUrl = null
      if (allowDownload && file) {
        sourceFileUrl = await uploadSourceFile(courseId, file).catch(e => {
          console.error('Firebase Storage upload failed:', e)
          return null
        })
      }

      const course = {
        id: courseId,
        title: courseName.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        sections: aiResult.sections,
        questions: aiResult.questions,
        passingScore: aiResult.passingScore || Math.ceil(aiResult.questions.length * 0.7),
        ...(sourceFileUrl && { allowDownload: true, sourceFileUrl, sourceFileName: file.name }),
      }

      await saveCourse(course)
      if (allowDownload && !sourceFileUrl) {
        setFileUploadFailed(true)
      }
      setCreatedCourse(course)
    } catch (err) {
      setError(err.message || 'שגיאה ביצירת הלומדה. נסה שוב.')
      setShowServerTips(!!err.isServerError)
    } finally {
      setLoading(false)
      setLoadingStep(0)
    }
  }

  const getCourseUrl = id => `${window.location.origin}/course/${id}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getCourseUrl(createdCourse.id))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const resetForm = () => {
    setCreatedCourse(null)
    setFile(null)
    setCourseName('')
    setDescription('')
    setAllowDownload(false)
    setError('')
    setFileUploadFailed(false)
  }

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (createdCourse) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-dark mb-1">הלומדה נוצרה בהצלחה!</h2>
            <p className="text-gray-500 mb-2 text-sm">{createdCourse.title}</p>
            <p className="text-gray-400 mb-4 text-sm">
              {createdCourse.sections.length} פרקים · {createdCourse.questions.length} שאלות
            </p>

            {fileUploadFailed && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 text-right">
                <p className="font-bold mb-1">⚠️ הקובץ המקורי לא הועלה</p>
                <p className="text-xs text-orange-600">
                  הלומדה נוצרה בהצלחה, אך לא ניתן היה להעלות את הקובץ להורדה.
                  כדי לתקן זאת, פתח את Firebase Console ← Storage ← Rules ועדכן לכלל: <code className="bg-orange-100 px-1 rounded">allow read, write: if true;</code>
                </p>
              </div>
            )}

            {createdCourse.allowDownload && createdCourse.sourceFileUrl && (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-right">
                ✅ הקובץ המקורי הועלה בהצלחה — ימצא כפתור הורדה בסיום הלומדה
              </div>
            )}

            {/* Link box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2 font-semibold">קישור לשיתוף עם עובדים:</p>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs text-gray-600 flex-1 overflow-hidden text-ellipsis whitespace-nowrap ltr-input bg-white border border-gray-200 rounded-lg px-3 py-2"
                  dir="ltr"
                >
                  {getCourseUrl(createdCourse.id)}
                </span>
                <button
                  onClick={copyLink}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {copied ? '✓ הועתק' : 'העתק'}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="flex-1 py-3 bg-dark text-white rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
              >
                עבור לניהול
              </button>
              <button
                onClick={resetForm}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm"
              >
                צור לומדה נוספת
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Create Form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Header subtitle="יצירת לומדה חדשה מקובץ" />
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-dark mb-1.5">
              מפתח API של Google Gemini
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary ltr-input"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title={showKey ? 'הסתר' : 'הצג'}
              >
                {showKey ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              קבל מפתח ב-{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                aistudio.google.com
              </a>
              . המפתח נשמר רק במחשב שלך.
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-dark mb-1.5">
              קובץ הנוהל
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
                dragOver
                  ? 'border-primary bg-primary-light'
                  : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.pdf,.pptx"
                className="hidden"
                onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])}
              />
              {file ? (
                <div>
                  <div className="text-4xl mb-2">📄</div>
                  <div className="font-bold text-dark text-sm">{file.name}</div>
                  <div className="text-xs text-gray-400 mt-1">לחץ להחלפת קובץ</div>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">⬆️</div>
                  <div className="font-bold text-dark mb-1 text-sm">גרור קובץ לכאן או לחץ לבחירה</div>
                  <div className="text-xs text-gray-400">PDF, DOCX, PPTX, TXT — עד 10MB</div>
                </div>
              )}
            </div>
          </div>

          {/* Course Name */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-dark mb-1.5">
              שם הלומדה <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="לדוגמה: עבודה בגובה — נהלי בטיחות"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-dark mb-1.5">
              תיאור קצר{' '}
              <span className="text-gray-400 font-normal">(אופציונלי)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 200))}
              placeholder="תיאור קצר של הלומדה..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
            />
            <div className="text-xs text-gray-400 mt-1 text-left">{description.length}/200</div>
          </div>

          {/* Allow Download */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={e => setAllowDownload(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer flex-shrink-0"
              />
              <div>
                <span className="text-sm font-bold text-dark">אפשר למודרך להוריד את הקובץ המקורי</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  בסיום הלומדה תוצג כפתור להורדת הנוהל שממנו נבנתה הלומדה
                </p>
              </div>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <div className="flex gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
              {showServerTips && (
                <ol className="mt-2 mr-6 list-decimal text-red-500 space-y-1">
                  <li>נסה שוב — לרוב זה זמני ועובר</li>
                  <li>אם הבקשה כבדה — שקול קובץ קטן יותר</li>
                  <li>אם זה קורה בתדירות גבוהה — בדוק את <a href="https://status.cloud.google.com" target="_blank" rel="noreferrer" className="underline">סטטוס ה-API</a></li>
                </ol>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mb-4 p-5 bg-primary-light border border-primary-200 rounded-xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="space-y-2">
                {[
                  { step: 1, label: 'קורא את הקובץ...' },
                  { step: 2, label: 'Gemini מנתח ויוצר את הלומדה...' },
                  { step: 3, label: 'שומר ומפרסם...' },
                ].map(({ step, label }) => (
                  <div key={step} className={`flex items-center gap-2 text-sm transition-all ${loadingStep >= step ? 'text-primary font-bold' : 'text-gray-400'}`}>
                    {loadingStep > step ? (
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${loadingStep === step ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                    )}
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {loading ? '⏳ מייצר לומדה...' : '✨ צור לומדה'}
          </button>
        </div>

        {/* Steps preview */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">איך זה עובד?</h3>
          <div className="flex items-center gap-2">
            {[
              { icon: '📤', label: 'העלה נוהל' },
              { icon: '🤖', label: 'AI יוצר לומדה' },
              { icon: '🔗', label: 'שתף קישור' },
              { icon: '✅', label: 'עובדים לומדים' },
            ].map((step, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex-1 text-center">
                  <div className="text-2xl mb-1">{step.icon}</div>
                  <div className="text-xs text-gray-500">{step.label}</div>
                </div>
                {i < 3 && <div className="text-gray-300 text-lg">‹</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
