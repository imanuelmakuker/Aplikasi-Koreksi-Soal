import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCheck, Printer, Save } from 'lucide-react';
import { generateAttendancePdf } from '../lib/pdfGenerator.ts';
import { ExamAttendance, ExamType, Ptk, School, Student, Subject, UserRole } from '../types.ts';

interface AttendanceViewProps {
  students: Student[];
  subjects: Subject[];
  ptkList: Ptk[];
  school: School | null;
  attendances: ExamAttendance[];
  tahunPelajaran: string;
  userRole: UserRole;
  onSaveAttendance: (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    tanggalUjian: string;
    subjectId: number;
    items: Array<{ studentId: number; statusKehadiran: string }>;
  }) => Promise<void>;
}

const EXAM_TYPES: ExamType[] = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];
const STATUS_OPTIONS = ['Hadir', 'Sakit', 'Izin', 'Tanpa Keterangan'] as const;

export function AttendanceView({
  students,
  subjects,
  ptkList,
  school,
  attendances,
  tahunPelajaran,
  userRole,
  onSaveAttendance,
}: AttendanceViewProps) {
  const canEdit =
    userRole === 'Administrator' || userRole === 'Guru' || userRole === 'Wali Kelas';

  const [jenisUjian, setJenisUjian] = useState<string>('PAS Ganjil');
  const [kelas, setKelas] = useState<string>('VI');
  const [tanggalUjian, setTanggalUjian] = useState<string>('2026-12-07');

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.jenisUjian === jenisUjian && s.kelas === kelas),
    [subjects, jenisUjian, kelas]
  );
  const classStudents = useMemo(
    () => students.filter((s) => s.kelas === kelas && s.statusSiswa === 'Aktif'),
    [students, kelas]
  );

  const [subjectId, setSubjectId] = useState<number>(0);

  useEffect(() => {
    if (classSubjects.length > 0 && !classSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(classSubjects[0].id);
    } else if (classSubjects.length === 0) {
      setSubjectId(0);
    }
  }, [classSubjects, subjectId]);

  const selectedSubject = classSubjects.find((s) => s.id === subjectId) || null;
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const next: Record<number, string> = {};
    for (const stu of classStudents) {
      const existing = attendances.find(
        (a) =>
          a.studentId === stu.id &&
          a.subjectId === subjectId &&
          a.jenisUjian === jenisUjian &&
          a.tahunPelajaran === tahunPelajaran &&
          a.tanggalUjian === tanggalUjian
      );
      next[stu.id] = existing?.statusKehadiran || 'Hadir';
    }
    setStatusMap(next);
  }, [classStudents, attendances, subjectId, jenisUjian, tahunPelajaran, tanggalUjian]);

  const summary = useMemo(() => {
    const counts = { Hadir: 0, Sakit: 0, Izin: 0, 'Tanpa Keterangan': 0 };
    for (const stu of classStudents) {
      const st = (statusMap[stu.id] || 'Hadir') as keyof typeof counts;
      if (st in counts) counts[st]++;
    }
    return counts;
  }, [classStudents, statusMap]);

  const handleMarkAllPresent = () => {
    const next: Record<number, string> = {};
    classStudents.forEach((s) => {
      next[s.id] = 'Hadir';
    });
    setStatusMap(next);
  };

  const handleSave = async () => {
    if (!selectedSubject) return;
    setSaving(true);
    setNotice(null);
    try {
      await onSaveAttendance({
        jenisUjian,
        tahunPelajaran,
        kelas,
        tanggalUjian,
        subjectId: selectedSubject.id,
        items: classStudents.map((s) => ({
          studentId: s.id,
          statusKehadiran: statusMap[s.id] || 'Hadir',
        })),
      });
      setNotice({
        type: 'success',
        msg: `Absensi ujian Kelas ${kelas} (${selectedSubject.namaMapel}, ${tanggalUjian}) berhasil disimpan.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedSubject) return;
    const teacherPtk =
      ptkList.find((p) => p.namaLengkap === selectedSubject.namaGuruPengampu) ||
      ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === kelas) ||
      null;
    generateAttendancePdf({
      school,
      subject: selectedSubject,
      jenisUjian,
      tahunPelajaran,
      kelas,
      tanggalUjian,
      rows: classStudents.map((student) => ({
        student,
        statusKehadiran: statusMap[student.id] || 'Hadir',
      })),
      teacherPtk,
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Absensi Peserta Ujian</h2>
              <p className="text-xs text-slate-500">
                Catat kehadiran peserta ujian per tanggal, jenis ujian, kelas, dan mata pelajaran.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B2447] whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                Tandai Hadir Semua
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!selectedSubject || classStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              Cetak / Unduh PDF
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !selectedSubject || classStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="w-4 h-4 text-[#EBC556]" />
                {saving ? 'Menyimpan...' : 'Simpan Absensi'}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Ujian</label>
            <select
              value={jenisUjian}
              onChange={(e) => setJenisUjian(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {EXAM_TYPES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Ujian</label>
            <input
              type="date"
              value={tanggalUjian}
              onChange={(e) => setTanggalUjian(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {classSubjects.length === 0 ? (
                <option value={0}>-- Tidak ada mapel --</option>
              ) : (
                classSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.namaMapel}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 flex justify-between items-center">
            <span className="text-xs font-semibold text-emerald-800">Hadir</span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-800">
              {summary.Hadir}
            </span>
          </div>
          <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 flex justify-between items-center">
            <span className="text-xs font-semibold text-amber-800">Sakit</span>
            <span className="text-xl font-bold font-mono tabular-nums text-amber-800">
              {summary.Sakit}
            </span>
          </div>
          <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 flex justify-between items-center">
            <span className="text-xs font-semibold text-blue-800">Izin</span>
            <span className="text-xl font-bold font-mono tabular-nums text-blue-800">
              {summary.Izin}
            </span>
          </div>
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/70 flex justify-between items-center">
            <span className="text-xs font-semibold text-red-700">Tanpa Keterangan</span>
            <span className="text-xl font-bold font-mono tabular-nums text-red-700">
              {summary['Tanpa Keterangan']}
            </span>
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

        {/* Attendance Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0B2447] text-white text-xs">
              <tr>
                <th className="px-4 py-3 w-14 text-center">No</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3 text-center">Jenis Kelamin</th>
                <th className="px-4 py-3">Keterangan Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Belum ada siswa aktif pada Kelas {kelas}.
                  </td>
                </tr>
              ) : (
                classStudents.map((stu, idx) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-700">
                      {stu.nisn || stu.nis}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{stu.namaLengkap}</td>
                    <td className="px-4 py-3 text-center font-mono">{stu.jenisKelamin}</td>
                    <td className="px-4 py-3">
                      <select
                        disabled={!canEdit}
                        value={statusMap[stu.id] || 'Hadir'}
                        onChange={(e) =>
                          setStatusMap((prev) => ({ ...prev, [stu.id]: e.target.value }))
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium bg-white"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
