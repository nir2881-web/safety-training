const SYSTEM_PROMPT = `אתה מומחה להכשרות בטיחות בעבודה.
המשימה: צור לומדת בטיחות קצרה וממוקדת מהנוהל שקיבלת.
1. חלק ל-3 עד 4 פרקים קצרים. כל פרק: כותרת + 2-3 משפטים בלבד.
2. צור 5 שאלות הבנה (4 תשובות, אחת נכונה).
3. ציון מעבר: 70% (4 מתוך 5).

החזר JSON בלבד:
{"sections":[{"title":"כותרת","content":"תוכן"}],"questions":[{"question":"שאלה","options":["א","ב","ג","ד"],"correct":0,"explanation":"הסבר"}],"passingScore":4}`

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
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
            source: { type: 'base64', media_type: 'application/pdf', data: fileData.base64 },
          },
          { type: 'text', text: 'צור לומדת בטיחות קצרה מהנוהל הזה.' },
        ],
      },
    ]
  } else {
    const text = typeof fileData === 'string' ? fileData : ''
    messages = [
      {
        role: 'user',
        content: `נוהל הבטיחות:\n\n${text.substring(0, 20000)}\n\nצור לומדת בטיחות קצרה מהנוהל הזה.`,
      },
    ]
  }

  let response
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages,
        stream: true,
      }),
    })
  } catch {
    throw new Error('לא ניתן להתחבר ל-Anthropic. ודא שאתה מחובר לאינטרנט.')
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
      throw new Error('הקובץ גדול מדי לעיבוד. נסה קובץ קטן יותר או המתן מספר שניות ונסה שוב.')
    }
    throw new Error(err.error?.message || `שגיאת API: ${response.status}`)
  }

  // Read streaming SSE response
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let raw = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue
      try {
        const event = JSON.parse(data)
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          raw += event.delta.text
        }
        if (event.type === 'error') {
          const msg = event.error?.message || 'שגיאת API'
          if (event.error?.type === 'authentication_error') throw new Error('מפתח API שגוי.')
          throw new Error(msg)
        }
      } catch (e) {
        if (e.message !== 'שגיאת API' && !e.message.includes('מפתח')) continue
        throw e
      }
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
  if (!result.questions || !Array.isArray(result.questions) || result.questions.length < 3) {
    throw new Error('לא נוצרו שאלות. נסה שוב.')
  }

  return result
}
