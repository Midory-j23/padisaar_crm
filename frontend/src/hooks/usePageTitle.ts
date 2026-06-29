import { useEffect } from 'react'

const APP_NAME = 'پدیسار CRM'

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${APP_NAME} — ${pageTitle}` : APP_NAME
  }, [pageTitle])
}

export function pageDocumentTitle(pageTitle: string): string {
  return `${APP_NAME} — ${pageTitle}`
}
