import { fa } from '@/lib/i18n/fa'

export default function AppFooter() {
  return (
    <footer className="border-t border-gray-200 bg-slate-50 px-4 py-4 text-center text-xs text-gray-500">
      {fa.app.poweredBy}
    </footer>
  )
}
