import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  GraduationCap,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  downloadStudentTemplate,
  exportStudentsExcel,
  parseStudentsExcel,
} from '../lib/excelUtils.ts';
import { generateStudentsRosterPdf } from '../lib/pdfGenerator.ts';
import { Ptk, School, Student, UserRole } from '../types.ts';
import { TablePagination } from './SchoolCrest.tsx';

interface StudentsViewProps {
  students: Student[];
  ptkList: Ptk[];
  school: School | null;
  tahunPelajaran: string;
  userRole: UserRole;
  onCreate: (payload: Partial<Student>) => Promise<void>;
  onBulkImport: (rows: Partial<Student>[]) => Promise<number>;
  onUpdate: (id: number, payload: Partial<Student>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const emptyStudent: Partial<Student> = {
  nis: '',
  nisn: '',
  namaLengkap: '',
  jenisKelamin: 'L',
  tempatTanggalLahir: '',
  kelas: 'VI',
  namaWaliKelas: '',
  alamat: '',
  statusSiswa: 'Aktif',
};

export function StudentsView({
  students,
  ptkList,
  school,
  tahunPelajaran,
  userRole,
  onCreate,
  onBulkImport,
  onUpdate,
  onDelete,
}: StudentsViewProps) {
  const canEdit = userRole === 'Administrator' || userRole === 'Wali Kelas';
  const canDelete = userRole === 'Administrator';

  const [search, setSearch] = useState('');
  const [kelasFilter, setKelasFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Student>>(emptyStudent);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const waliKelasOptions = ptkList.filter((p) => p.isWaliKelas || p.isGuruKelas);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchClass = kelasFilter === 'Semua' || s.kelas === kelasFilter;
      const matchSearch =
        s.namaLengkap.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q);
      return matchClass && matchSearch;
    });
  }, [students, search, kelasFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditingId(null);
    const defaultWali =
      ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === 'VI')?.namaLengkap || '';
    setForm({ ...emptyStudent, tahunPelajaran, namaWaliKelas: defaultWali });
    setModalOpen(true);
  };

  const openEdit = (row: Student) => {
    setEditingId(row.id);
    setForm({ ...row });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (editingId) {
        await onUpdate(editingId, { ...form, tahunPelajaran });
        setNotice({ type: 'success', msg: 'Data siswa berhasil diperbarui.' });
      } else {
        await onCreate({ ...form, tahunPelajaran });
        setNotice({ type: 'success', msg: 'Siswa baru berhasil ditambahkan.' });
      }
      setModalOpen(false);
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice(null);
    try {
      const parsed = await parseStudentsExcel(file);
      if (parsed.length === 0) {
        setNotice({ type: 'error', msg: 'Tidak ditemukan baris siswa yang valid di file Excel.' });
        return;
      }
      const imported = await onBulkImport(parsed);
      setNotice({
        type: 'success',
        msg: `Berhasil mengimpor ${imported} siswa dari Excel ke Tahun Pelajaran ${tahunPelajaran}.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message || 'Gagal memproses file Excel.' });
    } finally {
      e.target.value = '';
    }
  };

  const handlePrintPdf = () => {
    const wali = ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === kelasFilter) || null;
    generateStudentsRosterPdf({
      school,
      kelas: kelasFilter,
      tahunPelajaran,
      studentsList: filtered,
      waliKelasPtk: wali,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Data Siswa</h2>
              <p className="text-xs text-slate-500">
                Tahun Pelajaran {tahunPelajaran} · Tersedia otomatis di menu Koreksi dan Absensi Ujian.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => downloadStudentTemplate()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template Excel
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 cursor-pointer whitespace-nowrap shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  Import Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportExcel}
                  />
                </label>
              </>
            )}
            <button
              type="button"
              onClick={() => exportStudentsExcel(filtered, `Data_Siswa_${tahunPelajaran}.xlsx`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak PDF
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 text-[#EBC556]" />
                Tambah Siswa
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm border ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {notice.msg}
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama siswa, NIS, atau NISN..."
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm w-72"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            {['Semua', 'I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKelasFilter(k);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  kelasFilter === k
                    ? 'bg-[#0B2447] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {k === 'Semua' ? 'Semua Kelas' : `Kelas ${k}`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0B2447] text-white text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">NIS / NISN</th>
                <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                <th className="px-4 py-3 font-semibold">L/P</th>
                <th className="px-4 py-3 font-semibold">Kelas</th>
                <th className="px-4 py-3 font-semibold">Wali Kelas</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {canEdit && <th className="px-4 py-3 font-semibold text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Tidak ada data siswa pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                paginated.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-xs">
                      <div className="font-semibold text-slate-900">{s.nis}</div>
                      <div className="text-slate-500">{s.nisn || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.namaLengkap}</div>
                      <div className="text-xs text-slate-500">{s.tempatTanggalLahir || s.alamat || '-'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{s.jenisKelamin}</td>
                    <td className="px-4 py-3 font-semibold text-[#0B2447]">Kelas {s.kelas}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{s.namaWaliKelas || '-'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-700">
                      {s.statusSiswa}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(s)}
                              className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Modal Tambah/Edit Siswa */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#0B2447]">
                {editingId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Induk Siswa (NIS) *
                </label>
                <input
                  type="text"
                  required
                  value={form.nis || ''}
                  onChange={(e) => setForm({ ...form, nis: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  value={form.nisn || ''}
                  onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa *
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={form.jenisKelamin || 'L'}
                  onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempat Tanggal Lahir
                </label>
                <input
                  type="text"
                  placeholder="Warawaf, 14 Mei 2014"
                  value={form.tempatTanggalLahir || ''}
                  onChange={(e) => setForm({ ...form, tempatTanggalLahir: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas *</label>
                <select
                  value={form.kelas || 'VI'}
                  onChange={(e) => {
                    const k = e.target.value;
                    const wali = ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === k);
                    setForm({
                      ...form,
                      kelas: k,
                      namaWaliKelas: wali?.namaLengkap || form.namaWaliKelas || '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  {['I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Wali Kelas</label>
                <select
                  value={form.namaWaliKelas || ''}
                  onChange={(e) => setForm({ ...form, namaWaliKelas: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {waliKelasOptions.map((w) => (
                    <option key={w.id} value={w.namaLengkap}>
                      {w.namaLengkap}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat</label>
                <input
                  type="text"
                  value={form.alamat || ''}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Siswa</label>
                <select
                  value={form.statusSiswa || 'Aktif'}
                  onChange={(e) => setForm({ ...form, statusSiswa: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Pindah">Pindah</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Siswa</h3>
            <p className="text-sm text-slate-600">
              Hapus siswa <span className="font-semibold text-slate-900">{deleteTarget.namaLengkap}</span>?
              Seluruh hasil koreksi terkait siswa ini juga akan ikut terhapus.
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
