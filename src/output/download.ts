/** Отдаёт файл пользователю без участия сервера. */
export function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

/** Скачать содержимое, собранное в браузере. */
export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  downloadUrl(url, filename)
  // Не сразу: Firefox может оборвать загрузку, если URL отозван в том же такте.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
