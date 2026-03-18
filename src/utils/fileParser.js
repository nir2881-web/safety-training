/**
 * Extract text content from uploaded files.
 * PDF: returns { isPdf: true, base64: string } for Claude's document API.
 * DOCX: returns plain text string via mammoth.
 * PPTX: returns plain text string via JSZip XML parsing.
 * TXT: returns plain text string.
 */
export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'txt') {
    return readAsText(file)
  }

  if (ext === 'docx') {
    return extractDocx(file)
  }

  if (ext === 'pdf') {
    return extractPdf(file)
  }

  if (ext === 'pptx') {
    return extractPptx(file)
  }

  throw new Error('סוג קובץ לא נתמך. יש להעלות PDF, DOCX, PPTX או TXT')
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'))
    reader.readAsText(file, 'UTF-8')
  })
}

async function extractDocx(file) {
  const mammoth = await import('mammoth')
  const buffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  if (!result.value || result.value.trim().length < 10) {
    throw new Error('לא ניתן לחלץ טקסט מקובץ ה-DOCX')
  }
  return result.value
}

async function extractPdf(file) {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('קובץ ה-PDF גדול מדי (מעל 2MB). יש לדחוס את הקובץ או לפצל לחלקים קטנים יותר.')
  }
  // Use Claude's native PDF support via base64 document API
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return { isPdf: true, base64: btoa(binary) }
}

async function extractPptx(file) {
  const { default: JSZip } = await import('jszip')
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  // Find all slide XML files, sorted by slide number
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0])
      const nb = parseInt(b.match(/\d+/)[0])
      return na - nb
    })

  if (slideFiles.length === 0) {
    throw new Error('לא נמצאו שקפים בקובץ ה-PPTX')
  }

  let text = ''
  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('string')
    // Extract text nodes from XML
    const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || []
    const slideText = textMatches
      .map(match => match.replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 0)
      .join(' ')
    if (slideText) text += slideText + '\n\n'
  }

  if (!text.trim()) {
    throw new Error('לא ניתן לחלץ טקסט מהמצגת')
  }

  return text
}
