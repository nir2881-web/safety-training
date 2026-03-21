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

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callApi(apiKey, parts) {
  let response
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 4000,
        },
      }),
    })
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('הבקשה לקחה יותר מדי זמן (timeout). נסה עם קובץ קטן יותר.')
      err.isServerError = true
      throw err
    }
    throw new Error('לא ניתן להתחבר ל-Google. ודא שאתה מחובר לאינטרנט.')
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    if (response.status === 400) {
      throw new Error('מפתח API שגוי. אנא בדוק את המפתח ב-aistudio.google.com')
    }
    if (response.status === 403) {
      throw new Error('מפתח API אינו מורשה. ודא שה-API מופעל ב-aistudio.google.com')
    }
    if (response.status === 429) {
      throw new Error('חרגת ממגבלת הבקשות. המתן מספר שניות ונסה שוב.')
    }
    if (response.status === 500 || response.status === 503) {
      const retryErr = new Error('שרת Google לא זמין כרגע. מנסה שוב...')
      retryErr.isRetryable = true
      throw retryErr
    }
    throw new Error(err.error?.message || `שגיאת API: ${response.status}`)
  }

  const data = await response.json()
  // Gemini 2.5+ may return thinking tokens as separate parts (thought: true)
  // We need the actual response part, not the thinking part
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const textPart = parts.filter(p => !p.thought).pop()
  return textPart?.text ?? ''
}

export async function generateCourse(apiKey, fileData) {
  let parts

  if (fileData && fileData.isPdf) {
    parts = [
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: fileData.base64,
        },
      },
      { text: 'צור לומדת בטיחות מהנוהל הזה. התאם את מספר הפרקים והשאלות לאורך ולמורכבות המסמך.' },
    ]
  } else {
    const text = typeof fileData === 'string' ? fileData : ''
    parts = [
      { text: `נוהל הבטיחות (אורך: ${text.length.toLocaleString()} תווים):\n\n${text.substring(0, 20000)}\n\nצור לומדת בטיחות מהנוהל הזה. התאם את מספר הפרקים והשאלות לאורך המסמך.` },
    ]
  }

  // Retry up to 2 times on 500/503
  let raw
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      raw = await callApi(apiKey, parts)
      break
    } catch (e) {
      if (e.isRetryable && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
        continue
      }
      if (e.isRetryable) {
        const finalErr = new Error('שרת Google לא זמין. נסה שוב בעוד מספר שניות.')
        finalErr.isServerError = true
        throw finalErr
      }
      throw e
    }
  }

  raw = raw.trim()

  // Strip markdown code fences if present
  if (raw.startsWith('```')) {
    const fenceParts = raw.split('```')
    raw = fenceParts[1] || fenceParts[0]
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
