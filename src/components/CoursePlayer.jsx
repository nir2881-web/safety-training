import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { getCourseById, saveCompletion } from '../utils/storage'

const STEP_INFO = 1
const STEP_CONTENT = 2
const STEP_QUIZ = 3
const STEP_RESULT = 4

// ─── Step 1: Personal Info ────────────────────────────────────────────────────
function StepInfo({ onNext }) {
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'שם מלא הוא שדה חובה'
    if (!idNumber.trim()) e.idNumber = 'מספר ת"ז הוא שדה חובה'
    else if (!/^\d{9}$/.test(idNumber.trim())) e.idNumber = 'ת"ז חייב להכיל בדיוק 9 ספרות'
    if (!department.trim()) e.department = 'מחלקה/אתר הוא שדה חובה'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onNext({ name: name.trim(), idNumber: idNumber.trim(), department: department.trim() })
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-dark">פרטים אישיים</h2>
        <p className="text-sm text-gray-500 mt-1">מלא את הפרטים לפני תחילת הלומדה</p>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-dark mb-1.5">
          שם מלא <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
          placeholder="ישראל ישראלי"
          className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* ID */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-dark mb-1.5">
          מספר ת"ז <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={idNumber}
          onChange={e => { setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 9)); setErrors(p => ({ ...p, idNumber: '' })) }}
          placeholder="123456789"
          className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ltr-input ${errors.idNumber ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
          dir="ltr"
          inputMode="numeric"
          maxLength={9}
        />
        {errors.idNumber && <p className="text-xs text-red-500 mt-1">{errors.idNumber}</p>}
      </div>

      {/* Department */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-dark mb-1.5">
          מחלקה / אתר <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={department}
          onChange={e => { setDepartment(e.target.value); setErrors(p => ({ ...p, department: '' })) }}
          placeholder="לדוגמה: ייצור, אחזקה, משרד"
          className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${errors.department ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-primary'}`}
        />
        {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-4 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
      >
        המשך ללומדה ←
      </button>
    </div>
  )
}

// ─── Step 2: Course Content ───────────────────────────────────────────────────
function StepContent({ course, onFinish }) {
  const sections = course.sections || []
  const total = sections.length
  const [current, setCurrent] = useState(0)
  const [maxReached, setMaxReached] = useState(0)

  const goTo = idx => {
    setCurrent(idx)
    if (idx > maxReached) setMaxReached(idx)
  }

  const next = () => { if (current < total - 1) goTo(current + 1) }
  const prev = () => { if (current > 0) goTo(current - 1) }

  const isLast = current === total - 1
  const allRead = maxReached >= total - 1

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-bold text-dark">פרק {current + 1} מתוך {total}</span>
          <span className="text-gray-400 text-xs">{Math.round(((current + 1) / total) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full progress-bar"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Chapter tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {sections.map((_, i) => (
          <button
            key={i}
            onClick={() => i <= maxReached + 1 && goTo(i)}
            className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
              i === current
                ? 'bg-primary text-white'
                : i <= maxReached
                ? 'bg-primary-light text-primary'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Section card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6 min-h-[200px]">
        <div className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">פרק {current + 1}</div>
        <h2 className="text-xl font-bold text-dark mb-4 pb-4 border-b border-gray-100">
          {sections[current]?.title}
        </h2>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {sections[current]?.content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          disabled={current === 0}
          className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          → קודם
        </button>
        <div className="flex-1" />
        {isLast && allRead ? (
          <button
            onClick={onFinish}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
          >
            עבור לשאלות ←
          </button>
        ) : (
          <button
            onClick={next}
            disabled={isLast}
            className="px-6 py-3 bg-dark text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            הבא ←
          </button>
        )}
      </div>
      {isLast && !allRead && (
        <p className="text-xs text-gray-400 text-center mt-3">עבור בכל הפרקים כדי לעבור לשאלות</p>
      )}
    </div>
  )
}

// ─── Step 3: Quiz ─────────────────────────────────────────────────────────────
function StepQuiz({ course, attempt, onSubmit }) {
  const questions = course.questions || []
  const [answers, setAnswers] = useState(() => new Array(questions.length).fill(null))
  const answered = answers.filter(a => a !== null).length
  const allAnswered = answered === questions.length
  const letters = ['א', 'ב', 'ג', 'ד']

  const handleSelect = (qi, oi) => {
    setAnswers(prev => { const n = [...prev]; n[qi] = oi; return n })
  }

  const handleSubmit = () => {
    if (!allAnswered) return
    const score = answers.reduce((acc, ans, i) => acc + (ans === questions[i].correct ? 1 : 0), 0)
    onSubmit(score)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-dark">שאלות הבנה</h2>
        <p className="text-sm text-gray-500 mt-1">
          ענה על כל {questions.length} השאלות · נדרש {course.passingScore || 5}/{questions.length} למעבר
          {attempt > 1 && <span className="text-primary font-bold"> · ניסיון {attempt}</span>}
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="text-xs font-bold text-primary mb-2">שאלה {qi + 1}</div>
            <p className="font-bold text-dark text-sm mb-4 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => handleSelect(qi, oi)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm text-right transition-all ${
                    answers[qi] === oi
                      ? 'border-primary bg-primary-light font-bold'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${answers[qi] === oi ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {letters[oi]}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-400 mb-4">
        {answered} מתוך {questions.length} נענו
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className="w-full py-4 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
      >
        {allAnswered ? 'סיים וקבל תוצאה ←' : `ענה על כל השאלות (${answered}/${questions.length})`}
      </button>
    </div>
  )
}

// ─── Step 4: Result ───────────────────────────────────────────────────────────
function StepResult({ course, score, attempt, onRetryQuiz, onRetryAll }) {
  const total = (course.questions || []).length
  const passing = course.passingScore || 5
  const passed = score >= passing
  const pct = Math.round((score / total) * 100)

  return (
    <div className="max-w-md mx-auto">
      <div className={`rounded-2xl p-8 text-center mb-6 ${passed ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
        {/* Score circle */}
        <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center mx-auto mb-4 border-4 ${passed ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
          <span className={`text-3xl font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>{score}</span>
          <span className={`text-xs font-bold ${passed ? 'text-green-500' : 'text-red-400'}`}>/ {total}</span>
        </div>

        <h2 className={`text-2xl font-black mb-2 ${passed ? 'text-green-700' : 'text-red-700'}`}>
          {passed ? '✅ עברת את הלומדה בהצלחה!' : '❌ לא עברת את הלומדה'}
        </h2>
        <p className={`text-sm ${passed ? 'text-green-600' : 'text-red-500'}`}>
          קיבלת {score} מתוך {total} ({pct}%) · נדרש {passing}/{total} למעבר
        </p>
        {attempt > 1 && <p className="text-xs text-gray-400 mt-1">ניסיון מספר {attempt}</p>}
      </div>

      {!passed && (
        <div className="space-y-3">
          {attempt === 1 ? (
            <button
              onClick={onRetryQuiz}
              className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors"
            >
              🔄 נסה שוב
            </button>
          ) : (
            <button
              onClick={onRetryAll}
              className="w-full py-3.5 bg-dark text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              📖 חזור ללומדה מההתחלה
            </button>
          )}
        </div>
      )}

      {passed && (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-green-100">
          <div className="text-4xl mb-2">🏆</div>
          <p className="font-bold text-dark mb-1">כל הכבוד!</p>
          <p className="text-sm text-gray-500">השלמת בהצלחה את "{course.title}"</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CoursePlayer() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [step, setStep] = useState(STEP_INFO)
  const [userInfo, setUserInfo] = useState(null)
  const [attempt, setAttempt] = useState(1)
  const [score, setScore] = useState(null)

  useEffect(() => {
    getCourseById(id).then(found => {
      found ? setCourse(found) : setNotFound(true)
    })
  }, [id])

  const handleQuizSubmit = async finalScore => {
    const passed = finalScore >= (course.passingScore || 5)
    await saveCompletion({
      id: uuidv4(),
      courseId: id,
      name: userInfo.name,
      idNumber: userInfo.idNumber,
      department: userInfo.department,
      completedAt: new Date().toISOString(),
      passed,
      attempt,
      score: finalScore,
      totalQuestions: (course.questions || []).length,
    })
    setScore(finalScore)
    setStep(STEP_RESULT)
  }

  const handleRetryQuiz = () => { setAttempt(2); setScore(null); setStep(STEP_QUIZ) }
  const handleRetryAll = () => { setAttempt(a => a + 1); setScore(null); setStep(STEP_CONTENT) }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-dark mb-2">לומדה לא נמצאה</h2>
          <p className="text-sm text-gray-500">הקישור שגוי או שהלומדה נמחקה. פנה למנהל לקבלת קישור תקין.</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stepLabels = [
    { num: 1, label: 'פרטים' },
    { num: 2, label: 'לומדה' },
    { num: 3, label: 'שאלות' },
    { num: 4, label: 'תוצאה' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-dark text-white sticky top-0 z-50 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="https://images.cdn-files-a.com/uploads/1453047/400_5d6dfa0fc100d.png"
              alt="SafetyOn"
              className="h-7 object-contain"
              onError={e => { e.target.style.display = 'none' }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{course.title}</div>
              {course.description && <div className="text-xs text-gray-400 truncate">{course.description}</div>}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center">
            {stepLabels.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > s.num ? 'bg-primary text-white' :
                    step === s.num ? 'bg-primary text-white ring-2 ring-white/30' :
                    'bg-white/10 text-gray-500'
                  }`}>
                    {step > s.num
                      ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      : s.num}
                  </div>
                  <div className={`text-xs mt-0.5 ${step === s.num ? 'text-primary' : 'text-gray-500'}`}>{s.label}</div>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 rounded ${step > s.num ? 'bg-primary' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {step === STEP_INFO && <StepInfo onNext={info => { setUserInfo(info); setStep(STEP_CONTENT) }} />}
        {step === STEP_CONTENT && <StepContent course={course} onFinish={() => setStep(STEP_QUIZ)} />}
        {step === STEP_QUIZ && <StepQuiz course={course} attempt={attempt} onSubmit={handleQuizSubmit} />}
        {step === STEP_RESULT && <StepResult course={course} score={score} attempt={attempt} onRetryQuiz={handleRetryQuiz} onRetryAll={handleRetryAll} />}
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        מערכת לומדות SafetyOn · * הנוסח בלשון זכר אך מיועד לכל המינים
      </footer>
    </div>
  )
}
