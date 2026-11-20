import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Search,
  XCircle,
} from 'lucide-react';
import { exportGradesExcel } from '../lib/excelUtils.ts';
import { buildComprehensiveStudentReport } from '../lib/learningReportUtils.ts';
import { generateComprehensiveStudentReportPdf } from '../lib/pdfGenerator.ts';
import { ExamAttendance, GradingResult, Ptk, School, Student, Subject } from '../types.ts';
import { SchoolCrest } from './SchoolCrest.tsx';

interface LearningReportViewProps {
  school: School | null;
  ptkList: Ptk[];
  students: Student[];
  subjects: Subject[];
  gradingResults: GradingResult[];
  attendances: ExamAttendance[];
  tahunPelajaran: string;
}

export function LearningReportView({
  school,
  ptkList,
  students,
  subjects,
  gradingResults,
  attendances,
  tahunPelajaran,
}: LearningReportViewProps) {
  const [kelas, setKelas] = useState<string>('VI');
  const [search, setSearch] = useState('');

  const classStudents = useMemo(
    () =>
      students.filter((s) => {
        const matchClass = s.kelas === kelas && s.statusSiswa === 'Aktif';
        const q = search.trim().toLowerCase();
        const matchQ =
          !q ||
          s.namaLengkap.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q);
        return matchClass && matchQ;
      }),
    [students, kelas, search]
  );

  const [studentId, setStudentId] = useState<number>(0);

  useEffect(() => {
    if (classStudents.length > 0 && !classStudents.some((s) => s.id === studentId)) {
      setStudentId(classStudents[0].id);
    } else if (classStudents.length === 0) {
      setStudentId(0);
    }
  }, [classStudents, studentId]);

  const selectedStudent = classStudents.find((s) => s.id === studentId) || null;
  const kepalaPtk = ptkList.find((p) => p.isKepalaSekolah) || null;
  const waliPtk = ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === kelas) || null;

  const report = useMemo(() => {
    if (!selectedStudent) return null;
    return buildComprehensiveStudentReport({
      student: selectedStudent,
      subjects,
      gradingResults,
      attendances,
      tahunPelajaran,
    });
  }, [selectedStudent, subjects, gradingResults, attendances, tahunPelajaran]);

  const classComparisonList = useMemo(() => {
    return classStudents.map((stu) =>
      buildComprehensiveStudentReport({
        student: stu,
        subjects,
        gradingResults,
        attendances,
        tahunPelajaran,
      })
    );
  }, [classStudents, subjects, gradingResults, attendances, tahunPelajaran]);

  const handleDownloadPdf = () => {
    if (!report) return;
    generateComprehensiveStudentReportPdf({
      school,
      report,
      tahunPelajaran,
      waliKelasPtk: waliPtk,
    });
  };

  const handleExportExcel = () => {
    if (!report) return;
    exportGradesExcel(
      report.rows.map((r, idx) => ({
        No: idx + 1,
        'Mata Pelajaran': r.namaMapel,
        KKM: r.kkm,
        'PAS Ganjil': r.pasGanjil ?? '-',
        'PAS Genap': r.pasGenap ?? '-',
        'Ujian Sekolah': r.ujianSekolah ?? '-',
        'Rata-rata': r.rataRata ?? '-',
        Ketuntasan: r.statusAkhir,
      })),
      `Rapor_${report.student.namaLengkap}`.slice(0, 31),
      `Rapor_Hasil_Belajar_${report.student.namaLengkap}_${tahunPelajaran}.xlsx`
    );
  };

  return (
    <div className="space-y-5">
      {/* Control Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">
                Rapor Hasil Belajar Siswa (Gabungan Seluruh Ujian)
              </h2>
              <p className="text-xs text-slate-500">
                Menggabungkan nilai PAS Ganjil, PAS Genap, dan Ujian Sekolah dalam satu ringkasan PDF
                resmi per siswa · Tahun Pelajaran {tahunPelajaran}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!report}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 disabled:opacity-40 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Unduh Excel
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!report}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-[#EBC556]" />
              Unduh Rapor Hasil Belajar (PDF)
            </button>
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Kelas</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cari Siswa</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Siswa
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {classStudents.length === 0 ? (
                <option value={0}>-- Tidak ada siswa --</option>
              ) : (
                classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nis} · {s.namaLengkap}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Live Preview Sheet */}
      {!report ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          Belum ada siswa aktif pada Kelas {kelas}.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left: Official Document Sheet Preview */}
          <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
            {/* Kop Surat */}
            <div className="flex items-center gap-4 pb-4 border-b-2 border-[#0B2447]">
              {school?.logoSekolah ? (
                <img
                  src={school.logoSekolah}
                  alt="Logo Sekolah"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 object-contain shrink-0"
                />
              ) : (
                <SchoolCrest className="w-14 h-14 shrink-0" />
              )}
              <div className="flex-1 text-center">
                <div className="text-lg font-extrabold text-[#0B2447] uppercase">
                  {school?.namaSekolah || 'SD NEGERI WARAWAF'}
                </div>
                <div className="text-xs text-slate-600">
                  {school
                    ? `${school.alamatSekolah}, ${school.desaKampung}, Distrik ${school.distrik}, Kab. ${school.kabupaten}, ${school.provinsi}`
                    : 'Jl. Pendidikan No. 12, Warawaf'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  NPSN: {school?.npsn || '-'} · Status: {school?.statusSekolah || 'Negeri'} · Tahun
                  Pelajaran: {tahunPelajaran}
                </div>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-[#0B2447] tracking-wide uppercase">
                RAPOR HASIL BELAJAR SISWA
              </h3>
              <p className="text-xs text-slate-500">
                Ringkasan Nilai PAS Ganjil, PAS Genap, dan Ujian Sekolah · Tahun Pelajaran{' '}
                {tahunPelajaran}
              </p>
            </div>

            {/* Student Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between sm:justify-start sm:gap-3">
                <span className="text-slate-500 w-28">Nama Siswa</span>
                <span className="font-bold text-slate-900">: {report.student.namaLengkap}</span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-3">
                <span className="text-slate-500 w-28">Kelas</span>
                <span className="font-bold text-[#0B2447]">: Kelas {report.student.kelas}</span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-3">
                <span className="text-slate-500 w-28">NIS / NISN</span>
                <span className="font-mono text-slate-800">
                  : {report.student.nis} / {report.student.nisn || '-'}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:gap-3">
                <span className="text-slate-500 w-28">Wali Kelas</span>
                <span className="font-medium text-slate-800">
                  : {waliPtk?.namaLengkap || report.student.namaWaliKelas || '-'}
                </span>
              </div>
            </div>

            {/* Multi-Exam Grades Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0B2447] text-white text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-center">No</th>
                    <th className="px-3 py-2.5">Mata Pelajaran</th>
                    <th className="px-3 py-2.5 text-center">KKM</th>
                    <th className="px-3 py-2.5 text-right">PAS Ganjil</th>
                    <th className="px-3 py-2.5 text-right">PAS Genap</th>
                    <th className="px-3 py-2.5 text-right">Ujian Sekolah</th>
                    <th className="px-3 py-2.5 text-right">Rata-rata</th>
                    <th className="px-3 py-2.5 text-center">Ketuntasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Belum ada mata pelajaran terdaftar untuk Kelas {kelas}.
                      </td>
                    </tr>
                  ) : (
                    report.rows.map((r, idx) => (
                      <tr key={r.namaMapel} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2.5 text-center font-mono tabular-nums text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{r.namaMapel}</td>
                        <td className="px-3 py-2.5 text-center font-mono tabular-nums text-slate-600">
                          {r.kkm}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {r.pasGanjil !== null ? r.pasGanjil.toFixed(1) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {r.pasGenap !== null ? r.pasGenap.toFixed(1) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {r.ujianSekolah !== null ? r.ujianSekolah.toFixed(1) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-[#0B2447]">
                          {r.rataRata !== null ? r.rataRata.toFixed(2) : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {r.statusAkhir === 'TUNTAS' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              TUNTAS
                            </span>
                          ) : r.statusAkhir === 'BELUM TUNTAS' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                              <XCircle className="w-3.5 h-3.5" />
                              BELUM TUNTAS
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Belum Dinilai</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary & Attendance Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="font-bold text-[#0B2447]">Ringkasan Capaian Akademik</div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Rata-rata Keseluruhan</span>
                  <span className="font-mono tabular-nums font-bold text-[#0B2447]">
                    {report.overallAverage.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Mata Pelajaran Tuntas</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-700">
                    {report.tuntasCount} dari {report.gradedSubjectCount} mapel
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="font-bold text-[#0B2447]">Rekap Kehadiran Ujian</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Hadir</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {report.attendanceSummary.hadir}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sakit</span>
                    <span className="font-mono font-bold text-amber-600">
                      {report.attendanceSummary.sakit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Izin</span>
                    <span className="font-mono font-bold text-blue-600">
                      {report.attendanceSummary.izin}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tanpa Ket.</span>
                    <span className="font-mono font-bold text-red-600">
                      {report.attendanceSummary.tanpaKeterangan}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs text-slate-800">
              <div className="space-y-1.5">
                <div>Mengetahui,</div>
                <div className="font-semibold">Kepala Sekolah</div>
                <div className="h-12 flex items-center">
                  {school?.ttdKepalaSekolah ? (
                    <img
                      src={school.ttdKepalaSekolah}
                      alt="TTD Kepala Sekolah"
                      referrerPolicy="no-referrer"
                      className="h-11 object-contain"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">(Area tanda tangan)</span>
                  )}
                </div>
                <div className="font-bold underline">
                  {kepalaPtk?.namaLengkap || school?.namaKepalaSekolah || 'Nama Kepala Sekolah'}
                </div>
                <div className="font-mono text-slate-600">
                  NIP. {kepalaPtk?.nip || school?.nipKepalaSekolah || '................'}
                </div>
              </div>

              <div className="text-right space-y-1.5">
                <div>{school?.tempatTanggal || 'Warawaf, 2026'}</div>
                <div className="font-semibold">Wali Kelas {report.student.kelas}</div>
                <div className="h-12 flex items-center justify-end">
                  {waliPtk?.ttdDigital ? (
                    <img
                      src={waliPtk.ttdDigital}
                      alt="TTD Wali Kelas"
                      referrerPolicy="no-referrer"
                      className="h-11 object-contain"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">(Area tanda tangan)</span>
                  )}
                </div>
                <div className="font-bold underline">
                  {waliPtk?.namaLengkap || report.student.namaWaliKelas || 'Nama Wali Kelas'}
                </div>
                <div className="font-mono text-slate-600">
                  NIP. {waliPtk?.nip || '................'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Student Switcher List for Class */}
          <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0B2447]">
                <GraduationCap className="w-4 h-4 text-[#D4A62A]" />
                <span>Daftar Siswa Kelas {kelas}</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">{classStudents.length} siswa</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
              {classComparisonList.map((item) => {
                const isSelected = item.student.id === report.student.id;
                return (
                  <div
                    key={item.student.id}
                    className={`py-2.5 px-2.5 rounded-lg flex items-center justify-between gap-2 transition-colors ${
                      isSelected ? 'bg-amber-50/80 border border-[#D4A62A]/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setStudentId(item.student.id)}
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="text-xs font-bold text-[#0B2447] truncate">
                        {item.student.namaLengkap}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        Rata-rata: <strong>{item.overallAverage.toFixed(1)}</strong> · Tuntas:{' '}
                        {item.tuntasCount}/{item.gradedSubjectCount}
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Unduh Rapor PDF"
                      onClick={() =>
                        generateComprehensiveStudentReportPdf({
                          school,
                          report: item,
                          tahunPelajaran,
                          waliKelasPtk: waliPtk,
                        })
                      }
                      className="p-2 rounded-md border border-slate-200 bg-white hover:bg-[#0B2447] hover:text-white text-[#0B2447] transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
