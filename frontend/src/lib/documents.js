export function isPdfDocument(doc) {
  if (!doc) return false
  if (doc.mime_type === 'application/pdf') return true
  return (doc.file_name || doc.title || '').toLowerCase().endsWith('.pdf')
}
