import React, { useMemo, useState } from 'react';
import { BookOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { ExamType, Ptk, Subject, UserRole } from '../types.ts';
import { TablePagination } from './SchoolCrest.tsx';

interface SubjectsViewProps {
  subjects: Subject[];
  ptkList: Ptk[];
  tahunPelajaran: string;
  userRole: UserRole;
  onCreate: (payload: Partial<Subject>) => Promise<void>;
  onUpdate: (id: number, payload: Partial<Subject>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const EXAM_TYPES: ExamType[] = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];

const emptySubject: Partial<Subject> = {
  kodeMapel: '',
  namaMapel: '',
  kelas: 'VI',
  namaGuruPengampu: '',
  kkm: 70,
  jumlahSoal: 40,
  jenisUjian: 'PAS Ganjil',
};

export function SubjectsView({
  subjects,
  ptkList,
  tahunPelajaran,
  userRole,
  onCreate,
  onUpdate,
  onDelete,
}: SubjectsViewProps) {
  const canEdit = userRole === 'Administrator' || userRole === 'Guru';
  const canDelete = userRole === 'Administrator';
  const isAdmin = userRole === 'Administrator';

  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState<string>('Semua');
  const [kelasFilter, setKelasFilter] = useState<string>('Semua');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Subject>>(emptySubject);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchExam = examFilter === 'Semua' || s.jenisUjian === examFilter;
      const matchClass = kelasFilter === 'Semua' || s.kelas === kelasFilter;
      const matchQ =
        s.namaMapel.toLowerCase().includes(q) ||
        s.kodeMapel.toLowerCase().includes(q) ||
        s.namaGuruPengampu.toLowerCase().includes(q);
      return matchExam && matchClass && matchQ;
    });
  }, [subjects, examFilter, kelasFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptySubject,
      tahunPelajaran,
      jenisUjian: examFilter === 'Semua' ? 'PAS Ganjil' : examFilter,
      namaGuruPengampu: ptkList[1]?.namaLengkap || '',
    });
    setModalOpen(true);
  };

  const openEdit = (row: Subject) => {
    setEditingId(row.id);
    setForm({ ...row });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await onUpdate(editingId, { ...form, tahunPelajaran });
      } else {
        await onCreate({ ...form, tahunPelajaran });
      }
      setModalOpen(false);
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
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Data Mata Pelajaran</h2>
              <p className="text-xs text-slate-500">
                Terpisah menurut jenis ujian (PAS Ganjil, PAS Genap, Ujian Sekolah) dengan KKM awal 70.
              </p>
            </div>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-sm font-semibold whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 text-[#EBC556]" />
              Tambah Mata Pelajaran
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari kode, mapel, atau guru..."
                className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm w-60"
              />
            </div>
            <select
              value={kelasFilter}
              onChange={(e) => {
                setKelasFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="Semua">Semua Kelas</option>
              {['I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {['Semua', ...EXAM_TYPES].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setExamFilter(ex);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  examFilter === ex ? 'bg-[#0B2447] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0B2447] text-white text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">Kode</th>
                <th className="px-4 py-3 font-semibold">Mata Pelajaran</th>
                <th className="px-4 py-3 font-semibold">Kelas</th>
                <th className="px-4 py-3 font-semibold">Guru Pengampu</th>
                <th className="px-4 py-3 font-semibold text-center">KKM</th>
                <th className="px-4 py-3 font-semibold text-center">Jml Soal</th>
                <th className="px-4 py-3 font-semibold">Jenis Ujian</th>
                {canEdit && <th className="px-4 py-3 font-semibold text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Tidak ada mata pelajaran untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                paginated.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {s.kodeMapel}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.namaMapel}</td>
                    <td className="px-4 py-3 font-medium text-[#0B2447]">Kelas {s.kelas}</td>
                    <td className="px-4 py-3 text-slate-700">{s.namaGuruPengampu || '-'}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-bold text-slate-900">
                      {s.kkm}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-slate-700">
                      {s.jumlahSoal}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#0B2447]">{s.jenisUjian}</td>
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

      {/* Modal Tambah/Edit Mata Pelajaran */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#0B2447]">
                {editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Mapel *</label>
                <input
                  type="text"
                  required
                  placeholder="MTK-06"
                  value={form.kodeMapel || ''}
                  onChange={(e) => setForm({ ...form, kodeMapel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Ujian *</label>
                <select
                  value={form.jenisUjian || 'PAS Ganjil'}
                  onChange={(e) => setForm({ ...form, jenisUjian: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  {EXAM_TYPES.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Matematika"
                  value={form.namaMapel || ''}
                  onChange={(e) => setForm({ ...form, namaMapel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas *</label>
                <select
                  value={form.kelas || 'VI'}
                  onChange={(e) => setForm({ ...form, kelas: e.target.value })}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guru Pengampu
                </label>
                <select
                  value={form.namaGuruPengampu || ''}
                  onChange={(e) => setForm({ ...form, namaGuruPengampu: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="">-- Pilih Guru --</option>
                  {ptkList.map((p) => (
                    <option key={p.id} value={p.namaLengkap}>
                      {p.namaLengkap}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  KKM {!isAdmin && '(Default 70)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={!isAdmin}
                  value={form.kkm ?? 70}
                  onChange={(e) => setForm({ ...form, kkm: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Soal</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.jumlahSoal ?? 40}
                  onChange={(e) => setForm({ ...form, jumlahSoal: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
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
                  {saving ? 'Menyimpan...' : 'Simpan Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Mata Pelajaran</h3>
            <p className="text-sm text-slate-600">
              Hapus mata pelajaran{' '}
              <span className="font-semibold text-slate-900">
                {deleteTarget.namaMapel} (Kelas {deleteTarget.kelas} · {deleteTarget.jenisUjian})
              </span>
              ?
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
