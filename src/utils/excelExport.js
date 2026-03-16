import * as XLSX from 'xlsx'

export function exportCourseReport(course, completions) {
  if (completions.length === 0) {
    alert('אין נתוני השלמה עבור לומדה זו עדיין.')
    return
  }

  const data = completions.map(c => ({
    'שם מלא': c.name,
    'ת"ז': c.idNumber,
    'מחלקה': c.department,
    'שם הלומדה': course.title,
    'תאריך': new Date(c.completedAt).toLocaleDateString('he-IL'),
    'שעה': new Date(c.completedAt).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    'תוצאה': c.passed ? 'עבר' : 'נכשל',
    'ניסיון מס\'': c.attempt,
    'ציון': `${c.score}/${c.totalQuestions || 7}`,
  }))

  const ws = XLSX.utils.json_to_sheet(data, { cellDates: true })

  // Column widths
  ws['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 16 },
    { wch: 26 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 14 },
    { wch: 8 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'דוח לומדה')

  const safeName = course.title.replace(/[^a-zA-Z0-9\u0590-\u05FF\s]/g, '_').trim()
  XLSX.writeFile(wb, `דוח_${safeName}.xlsx`)
}

export function exportAllReport(courses, completions) {
  if (completions.length === 0) {
    alert('אין נתוני השלמה כלל.')
    return
  }

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]))

  const data = completions.map(c => ({
    'שם מלא': c.name,
    'ת"ז': c.idNumber,
    'מחלקה': c.department,
    'שם הלומדה': courseMap[c.courseId]?.title || 'לא ידוע',
    'תאריך': new Date(c.completedAt).toLocaleDateString('he-IL'),
    'שעה': new Date(c.completedAt).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    'תוצאה': c.passed ? 'עבר' : 'נכשל',
    'ניסיון מס\'': c.attempt,
    'ציון': `${c.score}/${c.totalQuestions || 7}`,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 26 },
    { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 8 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'דוח כללי')
  XLSX.writeFile(wb, 'דוח_כל_הלומדות.xlsx')
}
