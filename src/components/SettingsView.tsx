import React, { useEffect, useState } from 'react';
import {
  Database,
  Download,
  History,
  Plus,
  Settings,
  Shield,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ActivityLog, AppUser, UserRole } from '../types.ts';
import { TablePagination } from './SchoolCrest.tsx';

interface SettingsViewProps {
  currentUser: AppUser;
  usersList: AppUser[];
  activityLogs: ActivityLog[];
  onLoadAdminData: () => Promise<void>;
  onCreateUser: (payload: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    assignedClass: string;
  }) => Promise<void>;
  onUpdateUser: (id: number, payload: Partial<AppUser> & { password?: string }) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  onDownloadBackup: () => Promise<void>;
  onRestoreBackup: (jsonData: any) => Promise<void>;
}

export function SettingsView({
  currentUser,
  usersList,
  activityLogs,
  onLoadAdminData,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onDownloadBackup,
  onRestoreBackup,
}: SettingsViewProps) {
  const isAdmin = currentUser.role === 'Administrator';
  const [tab, setTab] = useState<'users' | 'backup' | 'logs'>(isAdmin ? 'users' : 'logs');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'Guru' as UserRole,
    assignedClass: '',
    isActive: true,
  });
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [logPage, setLogPage] = useState(1);
  const logPageSize = 10;

  useEffect(() => {
    onLoadAdminData();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'Guru',
      assignedClass: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditingUser(u);
    setForm({
      username: u.username || '',
      email: u.email,
      password: '',
      fullName: u.fullName,
      role: u.role,
      assignedClass: u.assignedClass || '',
      isActive: u.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, {
          email: form.email,
          fullName: form.fullName,
          role: form.role,
          assignedClass: form.assignedClass,
          isActive: form.isActive,
          password: form.password || undefined,
        });
        setNotice({ type: 'success', msg: 'Data pengguna berhasil diperbarui.' });
      } else {
        await onCreateUser(form);
        setNotice({ type: 'success', msg: 'Pengguna baru berhasil ditambahkan.' });
      }
      setModalOpen(false);
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message });
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onRestoreBackup(parsed);
      setNotice({ type: 'success', msg: 'File cadangan berhasil dipulihkan ke database.' });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message || 'Gagal memulihkan file JSON.' });
    } finally {
      e.target.value = '';
    }
  };

  const logTotalPages = Math.max(1, Math.ceil(activityLogs.length / logPageSize));
  const paginatedLogs = activityLogs.slice((logPage - 1) * logPageSize, logPage * logPageSize);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">
                Pengaturan Aplikasi, Pengguna &amp; Backup
              </h2>
              <p className="text-xs text-slate-500">
                Kelola hak akses pengguna, pencadangan database PostgreSQL, dan riwayat aktivitas sistem.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setTab('users')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                    tab === 'users' ? 'bg-[#0B2447] text-white' : 'text-slate-600'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Manajemen Pengguna
                </button>
                <button
                  type="button"
                  onClick={() => setTab('backup')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                    tab === 'backup' ? 'bg-[#0B2447] text-white' : 'text-slate-600'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Backup Database
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setTab('logs')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                tab === 'logs' ? 'bg-[#0B2447] text-white' : 'text-slate-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Riwayat Aktivitas
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`p-3 rounded-lg text-sm border ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {notice.msg}
          </div>
        )}

        {tab === 'users' && isAdmin && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-600">
                Peran tersedia: Administrator, Kepala Sekolah, Guru, dan Wali Kelas.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-[#EBC556]" />
                Tambah Akun Pengguna
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0B2447] text-white text-xs">
                  <tr>
                    <th className="px-4 py-3">Nama Lengkap</th>
                    <th className="px-4 py-3">Username / Email</th>
                    <th className="px-4 py-3">Peran (Role)</th>
                    <th className="px-4 py-3">Kelas Binaan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.fullName}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono font-semibold text-slate-800">
                          {u.username || '(Google OAuth)'}
                        </div>
                        <div className="text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#0B2447]">{u.role}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {u.assignedClass ? `Kelas ${u.assignedClass}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        <span className={u.isActive ? 'text-emerald-700' : 'text-red-600'}>
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="px-2.5 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => onDeleteUser(u.id)}
                              className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'backup' && isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <h3 className="text-base font-bold text-[#0B2447]">Unduh Cadangan Database (JSON)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mengekspor seluruh data sekolah, tahun pelajaran, PTK, siswa, mata pelajaran, soal &amp;
                kunci jawaban, nilai koreksi, dan absensi ujian ke file JSON permanen.
              </p>
              <button
                type="button"
                onClick={onDownloadBackup}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold"
              >
                <Download className="w-4 h-4 text-[#EBC556]" />
                Unduh Backup Database
              </button>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <h3 className="text-base font-bold text-[#0B2447]">Pulihkan Konfigurasi Backup</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unggah file backup JSON untuk memulihkan identitas sekolah dan arsip tahun pelajaran.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer">
                <Upload className="w-4 h-4" />
                Pilih File Backup (.json)
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0B2447] text-white text-xs">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Modul</th>
                  <th className="px-4 py-3">Aksi &amp; Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {paginatedLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{l.userName}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{l.userRole}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-[#0B2447]">{l.module}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">
                      <strong>{l.action}:</strong> {l.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={logPage}
              totalPages={logTotalPages}
              totalItems={activityLogs.length}
              pageSize={logPageSize}
              onPageChange={setLogPage}
            />
          </div>
        )}
      </div>

      {/* User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#0B2447]">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password {editingUser ? '(Kosongkan jika tidak diubah)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peran</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                    <option value="Guru">Guru</option>
                    <option value="Wali Kelas">Wali Kelas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas Binaan
                  </label>
                  <select
                    value={form.assignedClass}
                    onChange={(e) => setForm({ ...form, assignedClass: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="">Semua / Tidak ada</option>
                    {['I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editingUser && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Akun Aktif
                </label>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-sm font-semibold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
