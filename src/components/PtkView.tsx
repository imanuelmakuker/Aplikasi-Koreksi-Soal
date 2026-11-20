import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Upload, UserCheck, X } from 'lucide-react';
import { Ptk, UserRole } from '../types.ts';
import { TablePagination } from './SchoolCrest.tsx';

interface PtkViewProps {
  ptkList: Ptk[];
  userRole: UserRole;
  onCreate: (payload: Partial<Ptk>) => Promise<void>;
  onUpdate: (id: number, payload: Partial<Ptk>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const emptyPtk: Partial<Ptk> = {
  namaLengkap: '',
  nip: '',
  nuptk: '',
  pangkatGolongan: '',
  jabatan: '',
  statusKepegawaian: 'PNS',
  mataPelajaranDiampu: '',
  isKepalaSekolah: false,
  isWaliKelas: false,
  waliKelasUntuk: '',
  isGuruKelas: false,
  ttdDigital: '',
};

export function PtkView({ ptkList, userRole, onCreate, onUpdate, onDelete }: PtkViewProps) {
  const canEdit = userRole === 'Administrator';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Ptk>>(emptyPtk);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ptk | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ptkList.filter(
      (p) =>
        p.namaLengkap.toLowerCase().includes(q) ||
        p.nip.toLowerCase().includes(q) ||
        p.jabatan.toLowerCase().includes(q) ||
        p.mataPelajaranDiampu.toLowerCase().includes(q)
    );
  }, [ptkList, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyPtk);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: Ptk) => {
    setEditingId(row.id);
    setForm({ ...row });
    setError(null);
    setModalOpen(true);
  };

  const handleUploadSig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, ttdDigital: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await onUpdate(editingId, form);
      } else {
        await onCreate(form);
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data PTK.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">
                Data Pendidik dan Tenaga Kependidikan (PTK)
              </h2>
              <p className="text-xs text-slate-500">
                Kepala Sekolah dan Wali Kelas otomatis terhubung ke tanda tangan dokumen nilai dan absensi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama, NIP, jabatan..."
                className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm w-60"
              />
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-sm font-semibold whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 text-[#EBC556]" />
                Tambah PTK
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0B2447] text-white text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">Nama Lengkap &amp; NIP</th>
                <th className="px-4 py-3 font-semibold">NUPTK / Golongan</th>
                <th className="px-4 py-3 font-semibold">Jabatan &amp; Status</th>
                <th className="px-4 py-3 font-semibold">Tugas Tambahan</th>
                <th className="px-4 py-3 font-semibold">Mapel Diampu</th>
                {canEdit && <th className="px-4 py-3 font-semibold text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Tidak ada data PTK yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{row.namaLengkap}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        NIP: {row.nip || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono tabular-nums text-xs text-slate-700">
                        {row.nuptk || '-'}
                      </div>
                      <div className="text-xs text-slate-500">{row.pangkatGolongan || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{row.jabatan || '-'}</div>
                      <div className="text-xs text-slate-500">{row.statusKepegawaian}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {[
                        row.isKepalaSekolah ? 'Kepala Sekolah' : null,
                        row.isWaliKelas ? `Wali Kelas ${row.waliKelasUntuk}` : null,
                        row.isGuruKelas ? 'Guru Kelas' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Guru Mapel'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                      {row.mataPelajaranDiampu || '-'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            title="Edit PTK"
                            className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            title="Hapus PTK"
                            className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modal Tambah/Edit PTK */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#0B2447]">
                {editingId ? 'Edit Data PTK' : 'Tambah Data PTK'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Guru / PTK *
                </label>
                <input
                  type="text"
                  required
                  value={form.namaLengkap || ''}
                  onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIP</label>
                <input
                  type="text"
                  value={form.nip || ''}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NUPTK</label>
                <input
                  type="text"
                  value={form.nuptk || ''}
                  onChange={(e) => setForm({ ...form, nuptk: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pangkat / Golongan
                </label>
                <input
                  type="text"
                  value={form.pangkatGolongan || ''}
                  onChange={(e) => setForm({ ...form, pangkatGolongan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
                <input
                  type="text"
                  value={form.jabatan || ''}
                  onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Kepegawaian
                </label>
                <select
                  value={form.statusKepegawaian || 'PNS'}
                  onChange={(e) => setForm({ ...form, statusKepegawaian: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="GTT/Honor">GTT / Honor</option>
                  <option value="GTY">GTY</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran yang Diampu
                </label>
                <input
                  type="text"
                  value={form.mataPelajaranDiampu || ''}
                  onChange={(e) => setForm({ ...form, mataPelajaranDiampu: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isKepalaSekolah)}
                    onChange={(e) => setForm({ ...form, isKepalaSekolah: e.target.checked })}
                  />
                  Kepala Sekolah
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isGuruKelas)}
                    onChange={(e) => setForm({ ...form, isGuruKelas: e.target.checked })}
                  />
                  Guru Kelas
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(form.isWaliKelas)}
                      onChange={(e) => setForm({ ...form, isWaliKelas: e.target.checked })}
                    />
                    Wali Kelas
                  </label>
                  {form.isWaliKelas && (
                    <select
                      value={form.waliKelasUntuk || 'VI'}
                      onChange={(e) => setForm({ ...form, waliKelasUntuk: e.target.value })}
                      className="px-2 py-1 rounded border border-slate-300 text-xs"
                    >
                      {['I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => (
                        <option key={k} value={k}>
                          Kelas {k}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {form.ttdDigital ? (
                    <img
                      src={form.ttdDigital}
                      alt="TTD Digital"
                      referrerPolicy="no-referrer"
                      className="w-20 h-10 object-contain border border-slate-200 rounded bg-white"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">Belum ada TTD digital</span>
                  )}
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Tanda Tangan
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleUploadSig}
                  />
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan PTK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Data PTK</h3>
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus data PTK{' '}
              <span className="font-semibold text-slate-900">{deleteTarget.namaLengkap}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
