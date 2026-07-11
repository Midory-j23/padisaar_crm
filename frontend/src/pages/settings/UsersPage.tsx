import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { usersApi, type ManagedUser } from '@/api/users'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog, LoadingSkeleton } from '@/components/shared/SharedComponents'
import { usePermissions } from '@/hooks/usePermissions'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

export default function UsersPage() {
  const { isManager } = usePermissions()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('EXPERT')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await usersApi.list()
      setUsers(data)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openCreate = () => {
    setEditUser(null)
    setName('')
    setEmail('')
    setMobile('')
    setPassword('')
    setRole('EXPERT')
    setIsActive(true)
    setModalOpen(true)
  }

  const openEdit = (user: ManagedUser) => {
    setEditUser(user)
    setName(user.name)
    setEmail(user.email)
    setMobile(user.mobile ?? '')
    setPassword('')
    setRole(user.role)
    setIsActive(user.is_active)
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editUser) {
        await usersApi.update(editUser.id, {
          name,
          mobile: mobile.trim() === '' ? null : mobile.trim(),
          role,
          is_active: isActive,
        })
        toast.success(fa.toast.updateSuccess('کاربر'))
      } else {
        if (!password || password.length < 6) {
          toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد')
          setSaving(false)
          return
        }
        await usersApi.create({ name, email, mobile: mobile || undefined, password, role })
        toast.success(fa.toast.createSuccess('کاربر'))
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await usersApi.delete(deleteId)
      toast.success(fa.toast.deleteSuccess('کاربر'))
      setDeleteId(null)
      fetchUsers()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const canDeleteUser = (user: ManagedUser) =>
    isManager && user.id !== currentUserId

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.settings.addUser}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.userName}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.userEmail}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.userMobile}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.userRole}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.userStatus}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.accounts.operations}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3" dir="ltr">{u.email}</td>
                      <td className="px-4 py-3" dir="ltr">{u.mobile ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="blue">{enumLabel('role', u.role)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.is_active ? 'green' : 'gray'}>
                          {u.is_active ? fa.settings.active : fa.settings.inactive}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDeleteUser(u) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(u.id)}
                              title={fa.settings.deleteUser}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editUser ? fa.settings.editUser : fa.settings.addUser}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {fa.actions.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? fa.actions.submitting : fa.actions.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{fa.settings.userName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>{fa.settings.userEmail}</Label>
            <Input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editUser}
              required
            />
          </div>
          <div>
            <Label>{fa.settings.userMobile}</Label>
            <Input
              type="tel"
              dir="ltr"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={fa.auth.phonePlaceholder}
            />
          </div>
          {!editUser && (
            <div>
              <Label>{fa.auth.password}</Label>
              <Input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <Label>{fa.settings.userRole}</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="EXPERT">{enumLabel('role', 'EXPERT')}</option>
              <option value="MANAGER">{enumLabel('role', 'MANAGER')}</option>
            </Select>
          </div>
          {editUser && (
            <div>
              <Label>{fa.settings.userStatus}</Label>
              <Select
                value={isActive ? '1' : '0'}
                onChange={(e) => setIsActive(e.target.value === '1')}
              >
                <option value="1">{fa.settings.active}</option>
                <option value="0">{fa.settings.inactive}</option>
              </Select>
            </div>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={fa.settings.deleteUser}
        message={fa.confirm.deleteUser}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
