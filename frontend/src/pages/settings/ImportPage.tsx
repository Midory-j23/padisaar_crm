import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { fa } from '@/lib/i18n/fa'
import { toPersianDigits } from '@/lib/utils/persian'
import type { ImportRowPreview } from '@/types'

export default function ImportPage() {
  const [step, setStep] = useState(1)
  const [preview, setPreview] = useState<ImportRowPreview[]>([])
  const [validCount, setValidCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleDownloadTemplate = async () => {
    try {
      await reportsApi.exportAccounts(true)
      toast.success('قالب Excel دانلود شد')
      setStep(2)
    } catch {
      toast.error(fa.toast.error)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const { data } = await reportsApi.previewImportAccounts(file)
      setPreview(data.rows)
      setValidCount(data.valid_count)
      setStep(3)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      toast.error(message)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleConfirm = async () => {
    const validRecords = preview.filter((r) => r.valid).map((r) => r.record)
    if (validRecords.length === 0) {
      toast.error('رکورد معتبری برای ورود وجود ندارد')
      return
    }
    setImporting(true)
    try {
      const { data } = await reportsApi.confirmImportAccounts(validRecords)
      toast.success(fa.settings.importSuccess(data.created_count))
      setStep(1)
      setPreview([])
      setValidCount(0)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className={step >= 1 ? 'text-primary' : 'text-gray-400'}>
            <p className="font-medium">{fa.settings.importStep1}</p>
            <p className="mt-1 text-sm text-gray-500">
              فایل قالب را دانلود کنید، اطلاعات سازمان‌ها را وارد کنید و ذخیره کنید.
            </p>
            <Button variant="outline" className="mt-3" onClick={handleDownloadTemplate}>
              <Download className="ml-1 h-4 w-4" />
              {fa.settings.downloadTemplate}
            </Button>
          </div>

          <div className={step >= 2 ? 'text-primary' : 'text-gray-400'}>
            <p className="font-medium">{fa.settings.importStep2}</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              <span>{loading ? fa.actions.loading : fa.settings.uploadFile}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleUpload}
                disabled={loading}
              />
            </label>
          </div>

          {step >= 3 && preview.length > 0 && (
            <div>
              <p className="mb-3 font-medium">{fa.settings.importStep3}</p>
              <p className="mb-3 text-sm text-gray-600">
                {toPersianDigits(validCount)} رکورد معتبر ·{' '}
                {toPersianDigits(preview.length - validCount)} رکورد دارای خطا
              </p>
              <div className="max-h-80 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-right">ردیف</th>
                      <th className="px-3 py-2 text-right">نام سازمان</th>
                      <th className="px-3 py-2 text-right">شناسه ملی</th>
                      <th className="px-3 py-2 text-right">خطاها</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr
                        key={row.row_number}
                        className={`border-t ${row.valid ? 'bg-green-50/50' : 'bg-red-50/50'}`}
                      >
                        <td className="px-3 py-2">{toPersianDigits(row.row_number)}</td>
                        <td className="px-3 py-2">{String(row.record.name ?? '')}</td>
                        <td className="px-3 py-2">{String(row.record.national_id ?? '—')}</td>
                        <td className="px-3 py-2 text-xs text-red-600">
                          {row.errors.join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                className="mt-4"
                onClick={handleConfirm}
                disabled={importing || validCount === 0}
              >
                {importing ? fa.actions.submitting : fa.settings.confirmImport(validCount)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
