import React, { useEffect, useState } from 'react';
import { Building2, Calendar, CheckCircle2, Plus, Save, Upload } from 'lucide-react';
import { AcademicYear, School, UserRole } from '../types.ts';
import { SchoolCrest } from './SchoolCrest.tsx';

interface SchoolDataViewProps {
  school: School | null;
  academicYears: AcademicYear[];
  userRole: UserRole;
  onSaveSchool: (payload: Partial<School>) => Promise<void>;
  onAddAcademicYear: (tahunPelajaran: string) => Promise<void>;
  onActivateAcademicYear: (id: number) => Promise<void>;
}

export function SchoolDataView({
  school,
  academicYears,
  userRole,
  onSaveSchool,
  onAddAcademicYear,
  onActivateAcademicYear,
}: SchoolDataViewProps) {
  const isAdmin = userRole === 'Administrator';

  const [form, setForm] = useState<Partial<School>>({
    namaSekolah: '',
    npsn: '',
    statusSekolah: 'Negeri',
    alamatSekolah: '',
    desaKampung: '',
    distrik: '',
    kabupaten: '',
    provinsi: '',
    kodePos: '',
    tahunPelajaran: '2026/2027',
    logoSekolah: '',
    namaKepalaSekolah: '',
    nipKepalaSekolah: '',
    ttdKepalaSekolah: '',
    tempatTanggal: '',
  });
  const [newYear, setNewYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (school) {
      setForm({ ...school });
    }
  }, [school]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoSekolah' | 'ttdKepalaSekolah'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, [field]: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onSaveSchool(form);
      setFeedback({ type: 'success', msg: 'Identitas sekolah berhasil disimpan ke database.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Gagal menyimpan data sekolah.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear.trim()) return;
    setFeedback(null);
    try {
      await onAddAcademicYear(newYear.trim());
      setNewYear('');
      setFeedback({ type: 'success', msg: 'Tahun pelajaran baru berhasil ditambahkan ke arsip.' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Identitas Sekolah &amp; Kop Dokumen</h2>
              <p className="text-xs text-slate-500">
                Data ini otomatis ditampilkan pada header aplikasi dan seluruh cetakan PDF resmi.
              </p>
            </div>
          </div>
          {!isAdmin && (
            <span className="text-xs font-medium text-amber-700">
              Mode Baca (Hanya Administrator yang dapat mengubah)
            </span>
          )}
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3.5 rounded-lg text-sm border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah *</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={form.namaSekolah || ''}
              onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">NPSN *</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={form.npsn || ''}
              onChange={(e) => setForm({ ...form, npsn: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Sekolah</label>
            <select
              disabled={!isAdmin}
              value={form.statusSekolah || 'Negeri'}
              onChange={(e) => setForm({ ...form, statusSekolah: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            >
              <option value="Negeri">Negeri</option>
              <option value="Swasta">Swasta</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Sekolah</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.alamatSekolah || ''}
              onChange={(e) => setForm({ ...form, alamatSekolah: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Desa / Kampung</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.desaKampung || ''}
              onChange={(e) => setForm({ ...form, desaKampung: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Distrik / Kecamatan</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.distrik || ''}
              onChange={(e) => setForm({ ...form, distrik: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.kabupaten || ''}
              onChange={(e) => setForm({ ...form, kabupaten: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Provinsi</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.provinsi || ''}
              onChange={(e) => setForm({ ...form, provinsi: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Pos</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.kodePos || ''}
              onChange={(e) => setForm({ ...form, kodePos: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.tahunPelajaran || ''}
              onChange={(e) => setForm({ ...form, tahunPelajaran: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tempat dan Tanggal Dokumen
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              placeholder="Contoh: Warawaf, 18 Desember 2026"
              value={form.tempatTanggal || ''}
              onChange={(e) => setForm({ ...form, tempatTanggal: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kepala Sekolah</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.namaKepalaSekolah || ''}
              onChange={(e) => setForm({ ...form, namaKepalaSekolah: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.nipKepalaSekolah || ''}
              onChange={(e) => setForm({ ...form, nipKepalaSekolah: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums disabled:bg-slate-50"
            />
          </div>

          {/* Logo Sekolah & TTD Digital Kepala Sekolah */}
          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {form.logoSekolah ? (
                  <img
                    src={form.logoSekolah}
                    alt="Logo Sekolah"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-contain rounded-md bg-white border border-slate-200 p-1"
                  />
                ) : (
                  <SchoolCrest className="w-12 h-12" />
                )}
                <div>
                  <div className="text-sm font-semibold text-slate-800">Logo Sekolah</div>
                  <div className="text-xs text-slate-500">PNG/JPG untuk kop surat &amp; PDF</div>
                </div>
              </div>
              {isAdmin && (
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logoSekolah')}
                  />
                </label>
              )}
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {form.ttdKepalaSekolah ? (
                  <img
                    src={form.ttdKepalaSekolah}
                    alt="Tanda Tangan Kepala Sekolah"
                    referrerPolicy="no-referrer"
                    className="w-24 h-12 object-contain rounded-md bg-white border border-slate-200 p-1"
                  />
                ) : (
                  <div className="w-24 h-12 rounded-md border border-dashed border-slate-300 bg-white flex items-center justify-center text-[11px] text-slate-400">
                    Belum ada TTD
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Tanda Tangan Digital Kepala Sekolah
                  </div>
                  <div className="text-xs text-slate-500">Otomatis muncul di dokumen PDF</div>
                </div>
              </div>
              {isAdmin && (
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  Unggah TTD
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'ttdKepalaSekolah')}
                  />
                </label>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-sm font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <Save className="w-4 h-4 text-[#EBC556]" />
                {saving ? 'Menyimpan...' : 'Simpan Identitas Sekolah'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Arsip Tahun Pelajaran */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B2447]">Arsip Tahun Pelajaran</h3>
              <p className="text-xs text-slate-500">
                Data siswa, nilai, dan absensi tahun pelajaran sebelumnya tetap tersimpan dan dapat
                dibuka kembali kapan saja.
              </p>
            </div>
          </div>
          {isAdmin && (
            <form onSubmit={handleCreateYear} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="2027/2028"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono w-32"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Tahun
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {academicYears.map((y) => (
            <div
              key={y.id}
              className={`p-4 rounded-xl border flex items-center justify-between ${
                y.isActive ? 'border-[#D4A62A] bg-amber-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="font-mono tabular-nums font-bold text-slate-900">
                  {y.tahunPelajaran}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {y.isActive ? 'Tahun Pelajaran Aktif' : 'Arsip Tersimpan'}
                </div>
              </div>
              {y.isActive ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                isAdmin && (
                  <button
                    type="button"
                    onClick={() => onActivateAcademicYear(y.id)}
                    className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B2447] whitespace-nowrap"
                  >
                    Aktifkan
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
