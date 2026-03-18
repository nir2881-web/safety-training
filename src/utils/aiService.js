const SYSTEM_PROMPT = `אתה מומחה להכשרות בטיחות בעבודה. קיבלת את הטקסט הבא שחולץ מקובץ הדרכה.
המשימה:
1. חלק את התוכן ל-4 עד 6 פרקים קצרים וברורים בעברית. כל פרק: כותרת + 3-5 משפטים.
2. צור 7 שאלות הבנה אמריקאי (4 תשובות, אחת נכונה). השאלות יבחנו הבנה, לא שינון.
3. ציון מעבר: 70% (5 מתוך 7).

החזר JSON בלבד, ללא טקסט נוסף:
{
  "sections": [
    {"title": "כותרת הפרק", "content": "תוכן הפרק"}
  ],
  "questions": [
    {
      "question": "טקסט השאלה",
      "options": ["תשובה א", "תשובה ב", "תשובה ג", "תשובה ד"],
      "correct": 0,
      "explanation": "הסבר קצר לתשובה הנכונה"
    }
  ],
  "passingScore": 5
}`

const PROXY_URL = '/api/generate'
const MODEL = 'claude-sonnet-4-6'

export async function generateCourse(apiKey, fileData) {
  let messages

  if (fileData && fileData.isPdf) {
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: fileData.base64,
            },
          },
          { type: 'text', text: 'צור לומדת בטיחות מהנוהל הזה.' },
        ],
      },
    ]
  } else {
    const text = typeof fileData === 'string' ? fileData : ''
    messages = [
      {
        role: 'user',
        content: `נוהל הבטיחות:\n\n${text.substring(0, 15000)}\n\nצור לומדת בטיחות מקצועית מהנוהל הזה.`,
      },
    ]
  }

  let response
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        body: {
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
        },
      }),
    })
  } catch {
    throw new Error('לא ניתן להתחבר לשרת. ודא שהאתר פעיל ושאתה מחובר לאינטרנט.')
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 401) {
      throw new Error('מפתח API שגוי. אנא בדוק את המפתח ב-console.anthropic.com')
    }
    if (response.status === 429) {
      throw new Error('חרגת ממגבלת הבקשות. המתן מספר שניות ונסה שוב.')
    }
    throw new Error(err.error?.message || `שגיאת API: ${response.status}`)
  }

  const data = await response.json()
  let raw = data.content[0].text.trim()

  // Strip markdown code fences if present
  if (raw.startsWith('```')) {
    const parts = raw.split('```')
    raw = parts[1] || parts[0]
    if (raw.startsWith('json')) raw = raw.substring(4)
    raw = raw.trim()
  }

  let result
  try {
    result = JSON.parse(raw)
  } catch {
    throw new Error('תגובת ה-AI לא תקינה. נסה שוב.')
  }

  if (!result.sections || !Array.isArray(result.sections) || result.sections.length === 0) {
    throw new Error('לא נוצרו פרקים. נסה שוב עם קובץ אחר.')
  }
  if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
    throw new Error('לא נוצרו שאלות. נסה שוב.')
  }

  return result
}
