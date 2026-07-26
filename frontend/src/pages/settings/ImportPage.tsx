import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { fa } from '@/lib/i18n/fa'
import { toPersianDigits } from '@/lib/utils/persian'
import type { ImportRowPreview } from '@/types'

type ImportTab = 'accounts' | 'contacts'

interface ImportWizardProps {
  tab: ImportTab
  onReset: () => void
}

function ImportWizard({ tab, onReset }: ImportWizardProps) {
  const [step, setStep] = useState(1)
  const [preview, setPreview] = useState<ImportRowPreview[]>([])
  const [validCount, setValidCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  const isAccounts = tab === 'accounts'

  const handleDownloadTemplate = async () => {
    try {
      if (isAccounts) {
        await reportsApi.exportAccounts(true)
      } else {
        await reportsApi.exportContacts(true)
      }
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
      const { data } = isAccounts
        ? await reportsApi.previewImportAccounts(file)
        : await reportsApi.previewImportContacts(file)
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
      const { data } = isAccounts
        ? await reportsApi.confirmImportAccounts(validRecords)
        : await reportsApi.confirmImportContacts(validRecords)
      toast.success(fa.settings.importSuccess(data.created_count))
      setStep(1)
      setPreview([])
      setValidCount(0)
      onReset()
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setImporting(false)
    }
  }

  return (
    <CardContent className="space-y-4 p-6">
      <div className={step >= 1 ? 'text-primary' : 'text-gray-400'}>
        <p className="font-medium">{fa.settings.importStep1}</p>
        <p className="mt-1 text-sm text-gray-500">
          {isAccounts
            ? 'فایل قالب را دانلود کنید. فقط نام سازمان الزامی است؛ بقیه ستون‌ها می‌توانند خالی بمانند. در ستون کارشناس پیگیر، نام دقیق کاربر سامانه را بنویسید.'
            : 'فایل قالب را دانلود کنید؛ سازمان‌ها باید از قبل در سیستم ثبت شده باشند.'}
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
            {isAccounts
              ? 'فقط نام سازمان الزامی است؛ بقیه فیلدها می‌توانند خالی بمانند و بعداً تکمیل شوند. ستون «کارشناس پیگیر» در صورت تطبیق نام با کاربر سامانه، اختصاص داده می‌شود.'
              : null}
          </p>
          <p className="mb-3 text-sm text-gray-600">
            {toPersianDigits(validCount)} رکورد قابل ورود ·{' '}
            {toPersianDigits(preview.length - validCount)} رکورد دارای خطا
          </p>
          <div className="max-h-80 overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right">ردیف</th>
                  {isAccounts ? (
                    <>
                      <th className="px-3 py-2 text-right">نام سازمان</th>
                      <th className="px-3 py-2 text-right">شناسه ملی</th>
                      <th className="px-3 py-2 text-right">کارشناس پیگیر</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-right">نام مخاطب</th>
                      <th className="px-3 py-2 text-right">سازمان</th>
                      <th className="px-3 py-2 text-right">موبایل</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-right">پیام‌ها</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => {
                  const warnings = row.warnings ?? []
                  const messages = [...row.errors, ...warnings]
                  const hasHardError = !row.valid
                  return (
                  <tr
                    key={row.row_number}
                    className={`border-t ${
                      hasHardError
                        ? 'bg-red-50/50'
                        : warnings.length
                          ? 'bg-amber-50/50'
                          : 'bg-green-50/50'
                    }`}
                  >
                    <td className="px-3 py-2">{toPersianDigits(row.row_number)}</td>
                    {isAccounts ? (
                      <>
                        <td className="px-3 py-2">{String(row.record.name ?? '')}</td>
                        <td className="px-3 py-2">{String(row.record.national_id ?? '—')}</td>
                        <td className="px-3 py-2">
                          {String(row.record.account_manager_name ?? '—')}
                          {row.record.account_manager_id ? (
                            <span className="mr-1 text-xs text-green-700">✓</span>
                          ) : null}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">{String(row.record.full_name ?? '')}</td>
                        <td className="px-3 py-2">{String(row.record.account_name ?? '')}</td>
                        <td className="px-3 py-2">{String(row.record.mobile ?? '')}</td>
                      </>
                    )}
                    <td
                      className={`px-3 py-2 text-xs ${
                        hasHardError ? 'text-red-600' : warnings.length ? 'text-amber-700' : 'text-gray-500'
                      }`}
                    >
                      {messages.join(' · ') || '—'}
                    </td>
                  </tr>
                  )
                })}
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
  )
}

export default function ImportPage() {
  const [tab, setTab] = useState<ImportTab>('accounts')
  const [wizardKey, setWizardKey] = useState(0)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('accounts')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'accounts'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {fa.settings.importAccounts}
        </button>
        <button
          type="button"
          onClick={() => setTab('contacts')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'contacts'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {fa.settings.importContacts}
        </button>
      </div>
      <Card>
        <ImportWizard
          key={`${tab}-${wizardKey}`}
          tab={tab}
          onReset={() => setWizardKey((k) => k + 1)}
        />
      </Card>
    </div>
  )
}
