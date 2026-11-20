import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, PieChart, Printer } from 'lucide-react';
import { exportGradesExcel } from '../lib/excelUtils.ts';
import { generateClassRecapPdf, generateStudentReportPdf } from '../lib/pdfGenerator.ts';
import { ExamType, GradingResult, Ptk, School, Student, Subject } from '../types.ts';

interface RecapViewProps {
  students: Student[];
  subjects: Subject[];
  gradingResults: GradingResult[];
  ptkList: Ptk[];
  school: School | null;
  tahunPelajaran: string;
}

const EXAM_TYPES: ExamType[] = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];

export function RecapView({
  students,
  subjects,
  gradingResults,
  ptkList,
  school,
  tahunPelajaran,
}: RecapViewProps) {
  const [tab, setTab] = useState<'siswa' | 'mapel' | 'kelas' | 'ujian'>('siswa');
  const [jenisUjian, setJenisUjian] = useState<string>('PAS Ganjil');
  const [kelas, setKelas] = useState<string>('VI');

  const classStudents = useMemo(
    () => students.filter((s) => s.kelas === kelas && s.statusSiswa === 'Aktif'),
    [students, kelas]
  );
  const classSubjects = useMemo(
    () => subjects.filter((s) => s.kelas === kelas && s.jenisUjian === jenisUjian),
    [subjects, kelas, jenisUjian]
  );

  // Recap per student in selected class & exam
  const studentRecaps = useMemo(() => {
    return classStudents.map((stu) => {
      const stuGrades = gradingResults.filter(
        (g) =>
          g.studentId === stu.id &&
          g.jenisUjian === jenisUjian &&
          g.tahunPelajaran === tahunPelajaran
      );
      const totalScore = stuGrades.reduce((s, g) => s + g.nilaiAkhir, 0);
      const avg = stuGrades.length > 0 ? totalScore / stuGrades.length : 0;
      const tuntasCount = stuGrades.filter((g) => g.statusKetuntasan === 'TUNTAS').length;
      const belumCount = stuGrades.length - tuntasCount;
      return {
        student: stu,
        gradesCount: stuGrades.length,
        avg,
        tuntasCount,
        belumCount,
        stuGrades,
      };
    });
  }, [classStudents, gradingResults, jenisUjian, tahunPelajaran]);

  // Recap per subject
  const subjectRecaps = useMemo(() => {
    return subjects
      .filter((s) => s.jenisUjian === jenisUjian)
      .map((subj) => {
        const rows = gradingResults.filter(
          (g) =>
            g.subjectId === subj.id &&
            g.jenisUjian === jenisUjian &&
            g.tahunPelajaran === tahunPelajaran
        );
        const avg =
          rows.length > 0 ? rows.reduce((s, g) => s + g.nilaiAkhir, 0) / rows.length : 0;
        const tuntas = rows.filter((g) => g.statusKetuntasan === 'TUNTAS').length;
        const pct = rows.length > 0 ? (tuntas / rows.length) * 100 : 0;
        return { subject: subj, count: rows.length, avg, tuntas, belum: rows.length - tuntas, pct };
      });
  }, [subjects, gradingResults, jenisUjian, tahunPelajaran]);

  // Recap per class
  const classRecaps = useMemo(() => {
    return ['I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => {
      const stuCount = students.filter((s) => s.kelas === k && s.statusSiswa === 'Aktif').length;
      const rows = gradingResults.filter(
        (g) => g.kelas === k && g.jenisUjian === jenisUjian && g.tahunPelajaran === tahunPelajaran
      );
      const avg =
        rows.length > 0 ? rows.reduce((s, g) => s + g.nilaiAkhir, 0) / rows.length : 0;
      const tuntas = rows.filter((g) => g.statusKetuntasan === 'TUNTAS').length;
      const pct = rows.length > 0 ? (tuntas / rows.length) * 100 : 0;
      return { kelas: k, stuCount, totalGraded: rows.length, avg, tuntas, pct };
    });
  }, [students, gradingResults, jenisUjian, tahunPelajaran]);

  // Comparison across exam types
  const examComparison = useMemo(() => {
    return EXAM_TYPES.map((ex) => {
      const rows = gradingResults.filter(
        (g) => g.jenisUjian === ex && g.tahunPelajaran === tahunPelajaran
      );
      const avg =
        rows.length > 0 ? rows.reduce((s, g) => s + g.nilaiAkhir, 0) / rows.length : 0;
      const tuntas = rows.filter((g) => g.statusKetuntasan === 'TUNTAS').length;
      const pct = rows.length > 0 ? (tuntas / rows.length) * 100 : 0;
      return { jenisUjian: ex, totalGraded: rows.length, avg, tuntas, belum: rows.length - tuntas, pct };
    });
  }, [gradingResults, tahunPelajaran]);

  const waliPtk = ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === kelas) || null;

  const handlePrintStudentRapor = (stu: Student) => {
    const subjRows = classSubjects.map((subj) => ({
      subject: subj,
      grade:
        gradingResults.find(
          (g) =>
            g.studentId === stu.id &&
            g.subjectId === subj.id &&
            g.jenisUjian === jenisUjian &&
            g.tahunPelajaran === tahunPelajaran
        ) || null,
    }));
    generateStudentReportPdf({
      school,
      student: stu,
      jenisUjian,
      tahunPelajaran,
      rows: subjRows,
      waliKelasPtk: waliPtk,
    });
  };

  const handlePrintClassRecapPdf = () => {
    generateClassRecapPdf({
      school,
      kelas,
      jenisUjian,
      tahunPelajaran,
      subjectsList: classSubjects,
      studentsList: classStudents,
      grades: gradingResults,
      waliKelasPtk: waliPtk,
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Rekapitulasi Nilai</h2>
              <p className="text-xs text-slate-500">
                Rekap terpisah untuk PAS Ganjil, PAS Genap, dan Ujian Sekolah · Tahun Pelajaran{' '}
                {tahunPelajaran}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={jenisUjian}
              onChange={(e) => setJenisUjian(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
            >
              {EXAM_TYPES.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
            >
              {['I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePrintClassRecapPdf}
              disabled={classSubjects.length === 0 || classStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-[#EBC556]" />
              PDF Rekap Kelas {kelas}
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg w-fit">
          {[
            { id: 'siswa', label: 'Rekap Per Siswa & Rapor' },
            { id: 'mapel', label: 'Rekap Per Mata Pelajaran' },
            { id: 'kelas', label: 'Rekap Per Kelas' },
            { id: 'ujian', label: 'Perbandingan Semester & US' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === t.id ? 'bg-[#0B2447] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'siswa' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  exportGradesExcel(
                    studentRecaps.map((r, i) => ({
                      No: i + 1,
                      NIS: r.student.nis,
                      'Nama Siswa': r.student.namaLengkap,
                      'Mapel Dinilai': r.gradesCount,
                      'Mapel Tuntas': r.tuntasCount,
                      'Belum Tuntas': r.belumCount,
                      'Rata-rata': Number(r.avg.toFixed(2)),
                    })),
                    `Rekap_Siswa_${kelas}`,
                    `Rekap_Nilai_Siswa_Kelas_${kelas}_${jenisUjian}.xlsx`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-800 text-xs font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export Excel
              </button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0B2447] text-white text-xs">
                  <tr>
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3 text-center">Mapel Dinilai</th>
                    <th className="px-4 py-3 text-center">Tuntas</th>
                    <th className="px-4 py-3 text-center">Belum Tuntas</th>
                    <th className="px-4 py-3 text-right">Rata-rata</th>
                    <th className="px-4 py-3 text-center">Cetak Rapor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {studentRecaps.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Belum ada siswa pada Kelas {kelas}.
                      </td>
                    </tr>
                  ) : (
                    studentRecaps.map((r, idx) => (
                      <tr key={r.student.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-center font-mono tabular-nums text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-xs">{r.student.nis}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.student.namaLengkap}
                        </td>
                        <td className="px-4 py-3 text-center font-mono tabular-nums">
                          {r.gradesCount}
                        </td>
                        <td className="px-4 py-3 text-center font-mono tabular-nums text-emerald-700 font-bold">
                          {r.tuntasCount}
                        </td>
                        <td className="px-4 py-3 text-center font-mono tabular-nums text-red-600 font-bold">
                          {r.belumCount}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#0B2447]">
                          {r.avg.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintStudentRapor(r.student)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-[#0B2447]"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Rapor PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'mapel' && (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0B2447] text-white text-xs">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3 text-center">Kelas</th>
                  <th className="px-4 py-3 text-center">KKM</th>
                  <th className="px-4 py-3 text-center">Peserta</th>
                  <th className="px-4 py-3 text-center">Tuntas</th>
                  <th className="px-4 py-3 text-center">Belum</th>
                  <th className="px-4 py-3 text-right">Rata-rata</th>
                  <th className="px-4 py-3 text-right">% Tuntas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {subjectRecaps.map((r) => (
                  <tr key={r.subject.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{r.subject.kodeMapel}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.subject.namaMapel}</td>
                    <td className="px-4 py-3 text-center">Kelas {r.subject.kelas}</td>
                    <td className="px-4 py-3 text-center font-mono">{r.subject.kkm}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums">{r.count}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-emerald-700 font-bold">
                      {r.tuntas}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-red-600 font-bold">
                      {r.belum}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#0B2447]">
                      {r.avg.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                      {r.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'kelas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {classRecaps.map((c) => (
                <div key={c.kelas} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="text-sm font-bold text-[#0B2447]">Kelas {c.kelas}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {c.avg.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-600">
                    Siswa: {c.stuCount} · Dinilai: {c.totalGraded}
                  </div>
                  <div className="text-xs font-semibold text-emerald-700">
                    Ketuntasan: {c.pct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'ujian' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {examComparison.map((ex) => (
              <div key={ex.jenisUjian} className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="text-base font-bold text-[#0B2447]">{ex.jenisUjian}</div>
                <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900">
                  {ex.avg.toFixed(2)}
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#0B2447] rounded-full"
                    style={{ width: `${Math.min(100, ex.pct)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-600 flex justify-between pt-1">
                  <span>Total Nilai: {ex.totalGraded}</span>
                  <span className="font-semibold text-emerald-700">
                    Tuntas: {ex.tuntas} ({ex.pct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
