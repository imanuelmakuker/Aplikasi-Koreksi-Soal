import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Search,
  XCircle,
} from 'lucide-react';
import { exportGradesExcel } from '../lib/excelUtils.ts';
import { generateSubjectGradesPdf } from '../lib/pdfGenerator.ts';
import { ExamType, GradingResult, Ptk, School, Student, Subject } from '../types.ts';
import { TablePagination } from './SchoolCrest.tsx';

interface GradesListViewProps {
  students: Student[];
  subjects: Subject[];
  gradingResults: GradingResult[];
  ptkList: Ptk[];
  school: School | null;
  tahunPelajaran: string;
}

const EXAM_TYPES: ExamType[] = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];

export function GradesListView({
  students,
  subjects,
  gradingResults,
  ptkList,
  school,
  tahunPelajaran,
}: GradesListViewProps) {
  const [jenisUjian, setJenisUjian] = useState<string>('PAS Ganjil');
  const [kelas, setKelas] = useState<string>('VI');
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [sortBy, setSortBy] = useState<'nama' | 'nilai'>('nama');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const classSubjects = useMemo(
    () => subjects.filter((s) => s.jenisUjian === jenisUjian && s.kelas === kelas),
    [subjects, jenisUjian, kelas]
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

  const rows = useMemo(() => {
    if (!selectedSubject) return [];
    const classStudents = students.filter((s) => s.kelas === kelas);
    const joined = classStudents
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
      .filter((item): item is { student: Student; grade: GradingResult } => item !== null);

    const q = search.trim().toLowerCase();
    const filtered = joined.filter(
      (r) =>
        r.student.namaLengkap.toLowerCase().includes(q) ||
        r.student.nis.toLowerCase().includes(q) ||
        r.student.nisn.toLowerCase().includes(q)
    );

    return filtered.sort((a, b) => {
      if (sortBy === 'nilai') {
        return sortAsc ? a.grade.nilaiAkhir - b.grade.nilaiAkhir : b.grade.nilaiAkhir - a.grade.nilaiAkhir;
      }
      return sortAsc
        ? a.student.namaLengkap.localeCompare(b.student.namaLengkap)
        : b.student.namaLengkap.localeCompare(a.student.namaLengkap);
    });
  }, [students, gradingResults, selectedSubject, kelas, jenisUjian, tahunPelajaran, search, sortBy, sortAsc]);

  const stats = useMemo(() => {
    const peserta = rows.length;
    const tuntas = rows.filter((r) => r.grade.statusKetuntasan === 'TUNTAS').length;
    const belum = peserta - tuntas;
    const scores = rows.map((r) => r.grade.nilaiAkhir);
    const max = scores.length ? Math.max(...scores) : 0;
    const min = scores.length ? Math.min(...scores) : 0;
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const pct = peserta > 0 ? (tuntas / peserta) * 100 : 0;
    return { peserta, tuntas, belum, max, min, avg, pct };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginated = rows.slice((page - 1) * pageSize, page * pageSize);

  const kepalaSekolahPtk = ptkList.find((p) => p.isKepalaSekolah) || null;
  const teacherPtk =
    ptkList.find((p) => p.namaLengkap === selectedSubject?.namaGuruPengampu) ||
    ptkList.find((p) => p.isWaliKelas && p.waliKelasUntuk === kelas) ||
    null;

  const handleExportPdf = () => {
    if (!selectedSubject) return;
    generateSubjectGradesPdf({
      school,
      subject: selectedSubject,
      jenisUjian,
      tahunPelajaran,
      kelas,
      rows,
      teacherPtk,
    });
  };

  const handleExportExcel = () => {
    if (!selectedSubject) return;
    exportGradesExcel(
      rows.map((r, idx) => ({
        No: idx + 1,
        NIS: r.student.nis,
        NISN: r.student.nisn,
        'Nama Siswa': r.student.namaLengkap,
        'Jumlah Soal': r.grade.jumlahSoal,
        'Jawaban Benar': r.grade.jawabanBenar,
        'Jawaban Salah': r.grade.jawabanSalah,
        Nilai: r.grade.nilaiAkhir,
        KKM: r.grade.kkm,
        Keterangan: r.grade.statusKetuntasan,
      })),
      selectedSubject.namaMapel,
      `Daftar_Nilai_${selectedSubject.namaMapel}_Kelas_${kelas}_${jenisUjian}.xlsx`
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Daftar Nilai Siswa per Mata Pelajaran</h2>
              <p className="text-xs text-slate-500">
                Terhubung otomatis dari hasil koreksi soal beserta tanda tangan resmi Kepala Sekolah &amp; Guru.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!selectedSubject || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 disabled:opacity-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Unduh Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!selectedSubject || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-[#EBC556]" />
              Cetak / Unduh PDF
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Ujian</label>
            <select
              value={jenisUjian}
              onChange={(e) => {
                setJenisUjian(e.target.value);
                setPage(1);
              }}
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
              onChange={(e) => {
                setKelas(e.target.value);
                setPage(1);
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(Number(e.target.value));
                setPage(1);
              }}
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cari Siswa</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nama / NIS..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 6 KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="text-xs text-slate-500">Jumlah Peserta</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-[#0B2447]">
              {stats.peserta} Siswa
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
            <div className="text-xs text-emerald-700">Siswa Tuntas</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-800">
              {stats.tuntas}{' '}
              <span className="text-xs font-normal">({stats.pct.toFixed(1)}%)</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60">
            <div className="text-xs text-red-700">Belum Tuntas</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-red-700">
              {stats.belum} Siswa
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500">Nilai Tertinggi</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
              {stats.max.toFixed(2)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500">Nilai Terendah</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
              {stats.min.toFixed(2)}
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
            <div className="text-xs text-amber-800">Nilai Rata-rata</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-[#0B2447]">
              {stats.avg.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Grades Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0B2447] text-white text-xs">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">NIS</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('nama');
                      setSortAsc(sortBy === 'nama' ? !sortAsc : true);
                    }}
                    className="inline-flex items-center gap-1 font-semibold hover:text-[#EBC556]"
                  >
                    Nama Siswa <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">Jml Soal</th>
                <th className="px-4 py-3 text-center">Benar</th>
                <th className="px-4 py-3 text-center">Salah</th>
                <th className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('nilai');
                      setSortAsc(sortBy === 'nilai' ? !sortAsc : false);
                    }}
                    className="inline-flex items-center gap-1 font-semibold hover:text-[#EBC556]"
                  >
                    Nilai <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">KKM</th>
                <th className="px-4 py-3 text-center">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Belum ada nilai yang dikoreksi untuk mata pelajaran ini.
                  </td>
                </tr>
              ) : (
                paginated.map(({ student, grade }, idx) => (
                  <tr key={grade.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-slate-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-xs">{student.nis}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-xs text-slate-600">
                      {student.nisn || '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{student.namaLengkap}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums">
                      {grade.jumlahSoal}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-emerald-700 font-semibold">
                      {grade.jawabanBenar}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-red-600">
                      {grade.jawabanSalah}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#0B2447]">
                      {grade.nilaiAkhir.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-slate-600">
                      {grade.kkm}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {grade.statusKetuntasan === 'TUNTAS' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          TUNTAS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                          <XCircle className="w-3.5 h-3.5" />
                          BELUM TUNTAS
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={rows.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>

        {/* Official Signature Preview Block (Pulled automatically from Data PTK & Data Sekolah) */}
        <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-800 px-4">
          <div className="space-y-2">
            <div>Mengetahui,</div>
            <div className="font-semibold">Kepala Sekolah</div>
            <div className="h-14 flex items-center">
              {school?.ttdKepalaSekolah ? (
                <img
                  src={school.ttdKepalaSekolah}
                  alt="TTD Kepala Sekolah"
                  referrerPolicy="no-referrer"
                  className="h-12 object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400 italic">(Area tanda tangan resmi)</span>
              )}
            </div>
            <div className="font-bold underline">
              {kepalaSekolahPtk?.namaLengkap || school?.namaKepalaSekolah || 'Nama Kepala Sekolah'}
            </div>
            <div className="text-xs font-mono text-slate-600">
              NIP. {kepalaSekolahPtk?.nip || school?.nipKepalaSekolah || '........................'}
            </div>
          </div>

          <div className="md:text-right space-y-2">
            <div>{school?.tempatTanggal || 'Warawaf, 2026'}</div>
            <div className="font-semibold">Guru Kelas / Wali Kelas / Guru Mata Pelajaran</div>
            <div className="h-14 flex items-center md:justify-end">
              {teacherPtk?.ttdDigital ? (
                <img
                  src={teacherPtk.ttdDigital}
                  alt="TTD Guru"
                  referrerPolicy="no-referrer"
                  className="h-12 object-contain"
                />
              ) : (
                <span className="text-xs text-slate-400 italic">(Area tanda tangan resmi)</span>
              )}
            </div>
            <div className="font-bold underline">
              {teacherPtk?.namaLengkap || selectedSubject?.namaGuruPengampu || 'Nama Guru'}
            </div>
            <div className="text-xs font-mono text-slate-600">
              NIP. {teacherPtk?.nip || '........................'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
