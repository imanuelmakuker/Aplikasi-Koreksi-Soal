import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileCheck2, Printer } from 'lucide-react';
import { buildComprehensiveStudentReport } from '../lib/learningReportUtils.ts';
import {
  generateAttendancePdf,
  generateBeritaAcaraPdf,
  generateClassRecapPdf,
  generateComprehensiveStudentReportPdf,
  generateMasteryRecapPdf,
  generateStudentReportPdf,
  generateSubjectGradesPdf,
} from '../lib/pdfGenerator.ts';
import { ExamAttendance, ExamType, GradingResult, Ptk, School, Student, Subject } from '../types.ts';

interface PdfCenterViewProps {
  school: School | null;
  ptkList: Ptk[];
  students: Student[];
  subjects: Subject[];
  gradingResults: GradingResult[];
  attendances: ExamAttendance[];
  tahunPelajaran: string;
}

const EXAM_TYPES: ExamType[] = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];

export function PdfCenterView({
  school,
  ptkList,
  students,
  subjects,
  gradingResults,
  attendances,
  tahunPelajaran,
}: PdfCenterViewProps) {
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
  const [studentId, setStudentId] = useState<number>(0);

  useEffect(() => {
    if (classSubjects.length > 0 && !classSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(classSubjects[0].id);
    }
  }, [classSubjects, subjectId]);

  useEffect(() => {
    if (classStudents.length > 0 && !classStudents.some((s) => s.id === studentId)) {
      setStudentId(classStudents[0].id);
    }
  }, [classStudents, studentId]);

  const selectedSubject = classSubjects.find((s) => s.id === subjectId) || null;
  const selectedStudent = classStudents.find((s) => s.id === studentId) || null;
  const waliPtk = ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === kelas) || null;
  const teacherPtk =
    ptkList.find((p) => p.namaLengkap === selectedSubject?.namaGuruPengampu) || waliPtk;

  const docs = [
    {
      num: '01',
      title: 'Daftar Nilai Setiap Mata Pelajaran',
      format: 'A4 Landscape',
      desc: 'Tabel daftar nilai lengkap (NIS, NISN, Benar, Salah, Nilai, KKM, Ketuntasan) dengan tanda tangan resmi.',
      disabled: !selectedSubject,
      onClick: () => {
        if (!selectedSubject) return;
        const rows = classStudents
          .map((student) => {
            const grade = gradingResults.find(
              (g) =>
                g.studentId === student.id &&
                g.subjectId === selectedSubject.id &&
                g.jenisUjian === jenisUjian &&
                g.tahunPelajaran === tahunPelajaran
            );
            return grade ? { student, grade } : null;
          })
          .filter((r): r is { student: Student; grade: GradingResult } => r !== null);

        generateSubjectGradesPdf({
          school,
          subject: selectedSubject,
          jenisUjian,
          tahunPelajaran,
          kelas,
          rows,
          teacherPtk,
        });
      },
    },
    {
      num: '02',
      title: 'Rekapitulasi Nilai Setiap Siswa (Rapor)',
      format: 'A4 Portrait',
      desc: 'Rapor hasil ujian seluruh mata pelajaran untuk siswa terpilih beserta rata-rata dan tanda tangan wali kelas.',
      disabled: !selectedStudent || classSubjects.length === 0,
      onClick: () => {
        if (!selectedStudent) return;
        const rows = classSubjects.map((subj) => ({
          subject: subj,
          grade:
            gradingResults.find(
              (g) =>
                g.studentId === selectedStudent.id &&
                g.subjectId === subj.id &&
                g.jenisUjian === jenisUjian &&
                g.tahunPelajaran === tahunPelajaran
            ) || null,
        }));
        generateStudentReportPdf({
          school,
          student: selectedStudent,
          jenisUjian,
          tahunPelajaran,
          rows,
          waliKelasPtk: waliPtk,
        });
      },
    },
    {
      num: '03',
      title: 'Rekapitulasi Nilai Kelas',
      format: 'A4 Landscape',
      desc: 'Matriks nilai seluruh siswa pada semua mata pelajaran di kelas terpilih dengan jumlah, rata-rata, dan ketuntasan.',
      disabled: classSubjects.length === 0 || classStudents.length === 0,
      onClick: () => {
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
      },
    },
    {
      num: '04',
      title: 'Daftar Absensi Peserta Ujian',
      format: 'A4 Portrait',
      desc: 'Daftar hadir resmi peserta ujian per tanggal dan mata pelajaran beserta rekap Hadir, Sakit, Izin, dan Alpa.',
      disabled: !selectedSubject || classStudents.length === 0,
      onClick: () => {
        if (!selectedSubject) return;
        const rows = classStudents.map((student) => {
          const att = attendances.find(
            (a) =>
              a.studentId === student.id &&
              a.subjectId === selectedSubject.id &&
              a.jenisUjian === jenisUjian &&
              a.tahunPelajaran === tahunPelajaran &&
              a.tanggalUjian === tanggalUjian
          );
          return { student, statusKehadiran: att?.statusKehadiran || 'Hadir' };
        });
        generateAttendancePdf({
          school,
          subject: selectedSubject,
          jenisUjian,
          tahunPelajaran,
          kelas,
          tanggalUjian,
          rows,
          teacherPtk,
        });
      },
    },
    {
      num: '05',
      title: 'Rekap Ketuntasan Siswa',
      format: 'A4 Portrait',
      desc: 'Laporan ringkasan jumlah mata pelajaran tuntas dan belum tuntas untuk setiap siswa dalam satu kelas.',
      disabled: classStudents.length === 0,
      onClick: () => {
        const rows = classStudents.map((student) => {
          const stuGrades = gradingResults.filter(
            (g) =>
              g.studentId === student.id &&
              g.jenisUjian === jenisUjian &&
              g.tahunPelajaran === tahunPelajaran
          );
          const tuntasCount = stuGrades.filter((g) => g.statusKetuntasan === 'TUNTAS').length;
          const avg =
            stuGrades.length > 0
              ? stuGrades.reduce((a, b) => a + b.nilaiAkhir, 0) / stuGrades.length
              : 0;
          return {
            student,
            totalSubjects: stuGrades.length,
            tuntasCount,
            belumTuntasCount: stuGrades.length - tuntasCount,
            average: avg,
          };
        });
        generateMasteryRecapPdf({
          school,
          kelas,
          jenisUjian,
          tahunPelajaran,
          rows,
          waliKelasPtk: waliPtk,
        });
      },
    },
    {
      num: '06',
      title: 'Berita Acara Pelaksanaan & Hasil Penilaian',
      format: 'A4 Portrait',
      desc: 'Dokumen resmi berita acara pelaksanaan ujian, jumlah peserta hadir/tidak hadir, dan pengesahan.',
      disabled: !selectedSubject,
      onClick: () => {
        if (!selectedSubject) return;
        const attRows = attendances.filter(
          (a) =>
            a.subjectId === selectedSubject.id &&
            a.jenisUjian === jenisUjian &&
            a.tahunPelajaran === tahunPelajaran &&
            a.tanggalUjian === tanggalUjian
        );
        const hadirCount =
          attRows.length > 0
            ? attRows.filter((a) => a.statusKehadiran === 'Hadir').length
            : classStudents.length;
        const tidakHadirCount = Math.max(0, classStudents.length - hadirCount);

        generateBeritaAcaraPdf({
          school,
          kelas,
          jenisUjian,
          tahunPelajaran,
          subject: selectedSubject,
          tanggalUjian,
          hadirCount,
          tidakHadirCount,
          totalPeserta: classStudents.length,
          teacherPtk,
        });
      },
    },
    {
      num: '07',
      title: 'Rapor Hasil Belajar (Gabungan Semua Ujian)',
      format: 'A4 Portrait',
      desc: 'Menggabungkan nilai PAS Ganjil, PAS Genap, dan Ujian Sekolah per mata pelajaran beserta rekap kehadiran dalam 1 PDF per siswa.',
      disabled: !selectedStudent,
      onClick: () => {
        if (!selectedStudent) return;
        const report = buildComprehensiveStudentReport({
          student: selectedStudent,
          subjects,
          gradingResults,
          attendances,
          tahunPelajaran,
        });
        generateComprehensiveStudentReportPdf({
          school,
          report,
          tahunPelajaran,
          waliKelasPtk: waliPtk,
        });
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Pusat Cetak &amp; Unduh PDF Resmi</h2>
              <p className="text-xs text-slate-500">
                Seluruh dokumen berformat kertas A4 dengan kop sekolah, nomor halaman, tanggal cetak,
                dan tanda tangan Kepala Sekolah serta Wali Kelas/Guru.
              </p>
            </div>
          </div>
        </div>

        {/* Global Document Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Ujian</label>
            <select
              value={jenisUjian}
              onChange={(e) => setJenisUjian(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
            >
              {['I', 'II', 'III', 'IV', 'V', 'VI'].map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Siswa (Untuk Rapor)
            </label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
            >
              {classStudents.length === 0 ? (
                <option value={0}>-- Tidak ada siswa --</option>
              ) : (
                classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.namaLengkap}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Ujian</label>
            <input
              type="date"
              value={tanggalUjian}
              onChange={(e) => setTanggalUjian(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono"
            />
          </div>
        </div>

        {/* 6 PDF Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((docItem) => (
            <div
              key={docItem.num}
              className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between bg-white hover:border-[#0B2447]/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono font-bold text-[#0B2447]">Dokumen {docItem.num}</span>
                  <span>{docItem.format}</span>
                </div>
                <h3 className="text-base font-bold text-[#0B2447] flex items-start gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#D4A62A] shrink-0 mt-1" />
                  <span>{docItem.title}</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{docItem.desc}</p>
              </div>

              <button
                type="button"
                disabled={docItem.disabled}
                onClick={docItem.onClick}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                <Download className="w-4 h-4 text-[#EBC556]" />
                Unduh PDF Siap Cetak
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
