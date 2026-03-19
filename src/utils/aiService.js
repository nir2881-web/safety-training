const SYSTEM_PROMPT = `אתה מומחה להכשרות בטיחות בעבודה.
המשימה: צור לומדת בטיחות ממוקדת מהנוהל שקיבלת. התאם את הכמויות לאורך המסמך:

1. מספר פרקים — לפי אורך המסמך:
   • מסמך קצר (עד 2,000 תווים): 3-4 פרקים
   • מסמך בינוני (2,000–8,000 תווים): 5-7 פרקים
   • מסמך ארוך (מעל 8,000 תווים): 8-12 פרקים
   כל פרק: כותרת + 3-5 משפטים.

2. שאלות הבנה — לפי אורך המסמך:
   • מסמך קצר: 7 שאלות
   • מסמך בינוני: 8-9 שאלות
   • מסמך ארוך: 10 שאלות
   כל שאלה: 4 תשובות, אחת נכונה + הסבר.

3. ציון מעבר: 70% מסך השאלות (עגל כלפי מעלה).

החזר JSON בלבד:
{"sections":[{"title":"כותרת","content":"תוכן"}],"questions":[{"question":"שאלה","options":["א","ב","ג","ד"],"correct":0,"explanation":"הסבר"}],"passingScore":7}`

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

async function callApi(apiKey, messages) {
  let response
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('הבקשה לקחה יותר מדי זמן (timeout). נסה עם קובץ קטן יותר.')
      err.isServerError = true
      throw err
    }
    throw new Error('לא ניתן להתחבר ל-Anthropic. ודא שאתה מחובר לאינטרנט.')
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 401) {
      throw new Error('מפתח API שגוי. אנא בדוק את המפתח ב-console.anthropic.com')
    }
    if (response.status === 429) {
      throw new Error('חרגת ממגבלת הבקשות. המתן מספר שניות ונסה שוב.')
    }
    if (response.status === 504 || response.status === 502 || response.status === 503) {
      const retryErr = new Error('שרת Anthropic לא זמין כרגע. מנסה שוב...')
      retryErr.isRetryable = true
      throw retryErr
    }
    throw new Error(err.error?.message || `שגיאת API: ${response.status}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

export async function generateCourse(apiKey, fileData) {
  let messages

  if (fileData && fileData.isPdf) {
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: fileData.base64 },
          },
          { type: 'text', text: 'צור לומדת בטיחות מהנוהל הזה. התאם את מספר הפרקים והשאלות לאורך ולמורכבות המסמך.' },
        ],
      },
    ]
  } else {
    const text = typeof fileData === 'string' ? fileData : ''
    messages = [
      {
        role: 'user',
        content: `נוהל הבטיחות (אורך: ${text.length.toLocaleString()} תווים):\n\n${text.substring(0, 20000)}\n\nצור לומדת בטיחות מהנוהל הזה. התאם את מספר הפרקים והשאלות לאורך המסמך.`,
      },
    ]
  }

  // Retry up to 2 times on 504/502/503
  let raw
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      raw = await callApi(apiKey, messages)
      break
    } catch (e) {
      if (e.isRetryable && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
        continue
      }
      if (e.isRetryable) {
        const finalErr = new Error('שרת Anthropic לא זמין. נסה שוב בעוד מספר שניות.')
        finalErr.isServerError = true
        throw finalErr
      }
      throw e
    }
  }

  raw = raw.trim()

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
  if (!result.questions || !Array.isArray(result.questions) || result.questions.length < 5) {
    throw new Error('לא נוצרו שאלות. נסה שוב.')
  }

  return result
}
