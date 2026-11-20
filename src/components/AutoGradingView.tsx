import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  History,
  Play,
  RotateCcw,
  Save,
  Users,
  XCircle,
} from 'lucide-react';
import { ExamPaper, ExamType, GradingResult, Student, Subject, UserRole } from '../types.ts';

interface AutoGradingViewProps {
  students: Student[];
  subjects: Subject[];
  examPapers: ExamPaper[];
  gradingResults: GradingResult[];
  tahunPelajaran: string;
  userRole: UserRole;
  onAutoGradeSingle: (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    studentId: number;
    subjectId: number;
    jawabanSiswa: Record<string, string>;
    note?: string;
  }) => Promise<GradingResult>;
  onBatchGradeClass: (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    subjectId: number;
    entries: Array<{ studentId: number; jawabanSiswa: Record<string, string> }>;
  }) => Promise<GradingResult[]>;
}

const EXAM_TYPES: ExamType[] = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];

export function AutoGradingView({
  students,
  subjects,
  examPapers,
  gradingResults,
  tahunPelajaran,
  userRole,
  onAutoGradeSingle,
  onBatchGradeClass,
}: AutoGradingViewProps) {
  const canGrade =
    userRole === 'Administrator' || userRole === 'Guru' || userRole === 'Wali Kelas';

  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [jenisUjian, setJenisUjian] = useState<string>('PAS Ganjil');
  const [kelas, setKelas] = useState<string>('VI');

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
    } else if (classSubjects.length === 0) {
      setSubjectId(0);
    }
  }, [classSubjects, subjectId]);

  useEffect(() => {
    if (classStudents.length > 0 && !classStudents.some((s) => s.id === studentId)) {
      setStudentId(classStudents[0].id);
    } else if (classStudents.length === 0) {
      setStudentId(0);
    }
  }, [classStudents, studentId]);

  const selectedSubject = classSubjects.find((s) => s.id === subjectId) || null;
  const selectedStudent = classStudents.find((s) => s.id === studentId) || null;
  const paper = examPapers.find(
    (p) =>
      p.jenisUjian === jenisUjian &&
      p.tahunPelajaran === tahunPelajaran &&
      p.kelas === kelas &&
      p.subjectId === subjectId
  );

  const totalSoal = paper?.questions?.length || selectedSubject?.jumlahSoal || 0;
  const kkm = selectedSubject?.kkm ?? 70;

  const keyMap = useMemo(() => {
    const map: Record<string, string> = {};
    paper?.questions?.forEach((q) => {
      map[String(q.nomorSoal)] = q.kunciJawaban.trim().toUpperCase();
    });
    return map;
  }, [paper]);

  // Single-student answers state
  const existingGrade = gradingResults.find(
    (g) =>
      g.studentId === studentId &&
      g.subjectId === subjectId &&
      g.jenisUjian === jenisUjian &&
      g.tahunPelajaran === tahunPelajaran
  );

  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [computedPreview, setComputedPreview] = useState<{
    jumlahSoal: number;
    jawabanBenar: number;
    jawabanSalah: number;
    tidakDijawab: number;
    nilaiAkhir: number;
    kkm: number;
    statusKetuntasan: string;
  } | null>(null);
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Batch class answers state: studentId -> { "1": "A", ... }
  const [batchAnswers, setBatchAnswers] = useState<Record<number, Record<string, string>>>({});

  useEffect(() => {
    if (existingGrade) {
      setStudentAnswers({ ...existingGrade.jawabanSiswa });
      setComputedPreview({
        jumlahSoal: existingGrade.jumlahSoal,
        jawabanBenar: existingGrade.jawabanBenar,
        jawabanSalah: existingGrade.jawabanSalah,
        tidakDijawab: existingGrade.tidakDijawab,
        nilaiAkhir: existingGrade.nilaiAkhir,
        kkm: existingGrade.kkm,
        statusKetuntasan: existingGrade.statusKetuntasan,
      });
    } else {
      setStudentAnswers({});
      setComputedPreview(null);
    }
    setNotice(null);
  }, [studentId, subjectId, jenisUjian, existingGrade?.id]);

  // Initialize batch answers from existing saved grades
  useEffect(() => {
    const initial: Record<number, Record<string, string>> = {};
    for (const stu of classStudents) {
      const found = gradingResults.find(
        (g) =>
          g.studentId === stu.id &&
          g.subjectId === subjectId &&
          g.jenisUjian === jenisUjian &&
          g.tahunPelajaran === tahunPelajaran
      );
      initial[stu.id] = found ? { ...found.jawabanSiswa } : {};
    }
    setBatchAnswers(initial);
  }, [kelas, subjectId, jenisUjian, tahunPelajaran, classStudents.length]);

  const calculateScore = (answers: Record<string, string>) => {
    let benar = 0;
    let salah = 0;
    let kosong = 0;
    for (let i = 1; i <= totalSoal; i++) {
      const num = String(i);
      const ans = (answers[num] || '').trim().toUpperCase();
      const key = keyMap[num] || '';
      if (!ans) {
        kosong++;
      } else if (key && ans === key) {
        benar++;
      } else {
        salah++;
      }
    }
    const raw = totalSoal > 0 ? (benar / totalSoal) * 100 : 0;
    const nilaiAkhir = Number(Math.max(0, Math.min(100, raw)).toFixed(2));
    return {
      jumlahSoal: totalSoal,
      jawabanBenar: benar,
      jawabanSalah: salah,
      tidakDijawab: kosong,
      nilaiAkhir,
      kkm,
      statusKetuntasan: nilaiAkhir >= kkm ? 'TUNTAS' : 'BELUM TUNTAS',
    };
  };

  const handleRunAutoGrade = () => {
    setNotice(null);
    if (!paper || paper.questions.length === 0) {
      setNotice({
        type: 'error',
        msg: 'Kunci jawaban belum tersedia untuk mata pelajaran ini. Silakan input kunci jawaban terlebih dahulu.',
      });
      return;
    }
    setComputedPreview(calculateScore(studentAnswers));
  };

  const handleSaveSingle = async () => {
    if (!selectedStudent || !selectedSubject) return;
    setSaving(true);
    setNotice(null);
    try {
      const saved = await onAutoGradeSingle({
        jenisUjian,
        tahunPelajaran,
        kelas,
        studentId: selectedStudent.id,
        subjectId: selectedSubject.id,
        jawabanSiswa: studentAnswers,
        note: editNote || undefined,
      });
      setEditNote('');
      setNotice({
        type: 'success',
        msg: `Hasil koreksi untuk ${selectedStudent.namaLengkap} (${saved.nilaiAkhir.toFixed(
          2
        )} · ${saved.statusKetuntasan}) berhasil disimpan permanen ke Daftar Nilai.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!selectedSubject || classStudents.length === 0) return;
    setSaving(true);
    setNotice(null);
    try {
      const entries = classStudents.map((stu) => ({
        studentId: stu.id,
        jawabanSiswa: batchAnswers[stu.id] || {},
      }));
      const saved = await onBatchGradeClass({
        jenisUjian,
        tahunPelajaran,
        kelas,
        subjectId: selectedSubject.id,
        entries,
      });
      setNotice({
        type: 'success',
        msg: `Berhasil mengoreksi & menyimpan nilai ${saved.length} siswa Kelas ${kelas} untuk ${selectedSubject.namaMapel}.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Koreksi Soal Otomatis</h2>
              <p className="text-xs text-slate-500">
                Rumus: Nilai = (Jawaban Benar / Total Soal) × 100 · Penentuan ketuntasan otomatis
                berdasarkan KKM {kkm}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                mode === 'single' ? 'bg-[#0B2447] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Koreksi Per Siswa
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                mode === 'batch' ? 'bg-[#0B2447] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Koreksi Satu Kelas Sekaligus
            </button>
          </div>
        </div>

        {/* Step Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">1. Jenis Ujian</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">2. Kelas</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. Mata Pelajaran
            </label>
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
                    {s.namaMapel} (KKM {s.kkm})
                  </option>
                ))
              )}
            </select>
          </div>
          {mode === 'single' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">4. Nama Siswa</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                {classStudents.length === 0 ? (
                  <option value={0}>-- Belum ada siswa --</option>
                ) : (
                  classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nis} · {s.namaLengkap}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        {notice && (
          <div
            className={`p-3.5 rounded-lg text-sm border ${
              notice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {notice.msg}
          </div>
        )}

        {!paper || paper.questions.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-center text-sm text-amber-900">
            Kunci jawaban untuk <strong>{selectedSubject?.namaMapel || 'mata pelajaran ini'}</strong>{' '}
            Kelas {kelas} ({jenisUjian}) belum diinput. Silakan isi kunci jawaban pada menu{' '}
            <strong>Input Soal dan Kunci Jawaban</strong> terlebih dahulu.
          </div>
        ) : mode === 'single' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Answer Entry Grid */}
            <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B2447]">
                  Input Jawaban Siswa ({totalSoal} Soal)
                </span>
                <button
                  type="button"
                  disabled={!canGrade}
                  onClick={() => {
                    setStudentAnswers({});
                    setComputedPreview(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Jawaban
                </button>
              </div>
              <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
                {Array.from({ length: totalSoal }, (_, i) => i + 1).map((num) => {
                  const keyStr = String(num);
                  const chosen = studentAnswers[keyStr] || '';
                  const correctKey = keyMap[keyStr] || '';
                  const showResult = computedPreview !== null;
                  const isCorrect = chosen && chosen === correctKey;

                  return (
                    <div
                      key={num}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50/70"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 font-mono tabular-nums text-xs font-bold text-[#0B2447]">
                          No. {num}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              disabled={!canGrade}
                              onClick={() =>
                                setStudentAnswers((prev) => ({
                                  ...prev,
                                  [keyStr]: prev[keyStr] === opt ? '' : opt,
                                }))
                              }
                              className={`w-9 h-8 rounded-md font-mono font-bold text-xs border transition-colors ${
                                chosen === opt
                                  ? 'bg-[#0B2447] text-[#EBC556] border-[#0B2447]'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {showResult && (
                        <div className="text-xs font-mono tabular-nums flex items-center gap-2">
                          <span className="text-slate-400">Kunci: {correctKey}</span>
                          {!chosen ? (
                            <span className="text-slate-500">Kosong</span>
                          ) : isCorrect ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Benar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                              <XCircle className="w-3.5 h-3.5" /> Salah
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Auto-Grade Trigger & Result Card */}
            <div className="lg:col-span-5 space-y-4">
              {canGrade && (
                <button
                  type="button"
                  onClick={handleRunAutoGrade}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0B2447] hover:bg-[#113260] text-white font-bold text-sm shadow-sm transition-colors"
                >
                  <Play className="w-4 h-4 text-[#EBC556]" />
                  KOREKSI OTOMATIS
                </button>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-xs text-slate-500">Hasil Koreksi Siswa</div>
                    <div className="font-bold text-[#0B2447]">
                      {selectedStudent?.namaLengkap || '-'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Kelas {kelas} · {selectedSubject?.namaMapel} · {jenisUjian}
                    </div>
                  </div>
                  {computedPreview && (
                    <div className="text-right">
                      <div className="text-3xl font-extrabold font-mono tabular-nums text-[#0B2447]">
                        {computedPreview.nilaiAkhir.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          computedPreview.statusKetuntasan === 'TUNTAS'
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        {computedPreview.statusKetuntasan} (KKM {computedPreview.kkm})
                      </div>
                    </div>
                  )}
                </div>

                {computedPreview ? (
                  <>
                    <div className="grid grid-cols-2 gap-2.5 text-sm">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 flex justify-between">
                        <span className="text-slate-600">Jumlah Soal</span>
                        <span className="font-mono tabular-nums font-bold">
                          {computedPreview.jumlahSoal}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex justify-between text-emerald-800">
                        <span>Jawaban Benar</span>
                        <span className="font-mono tabular-nums font-bold">
                          {computedPreview.jawabanBenar}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex justify-between text-red-700">
                        <span>Jawaban Salah</span>
                        <span className="font-mono tabular-nums font-bold">
                          {computedPreview.jawabanSalah}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-slate-200 flex justify-between text-slate-700">
                        <span>Tidak Dijawab</span>
                        <span className="font-mono tabular-nums font-bold">
                          {computedPreview.tidakDijawab}
                        </span>
                      </div>
                    </div>

                    {existingGrade && canGrade && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Catatan Koreksi Ulang (Opsional)
                        </label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Contoh: Perbaikan input jawaban nomor 7"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                      </div>
                    )}

                    {canGrade && (
                      <button
                        type="button"
                        onClick={handleSaveSingle}
                        disabled={saving}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
                      >
                        <Save className="w-4 h-4" />
                        {saving
                          ? 'Menyimpan...'
                          : existingGrade
                          ? 'PERBARUI & SIMPAN HASIL KOREKSI'
                          : 'SIMPAN HASIL KOREKSI'}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Masukkan jawaban siswa di sebelah kiri, lalu klik{' '}
                    <strong>KOREKSI OTOMATIS</strong>.
                  </div>
                )}

                {existingGrade && existingGrade.editHistory?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <History className="w-3.5 h-3.5" />
                      Riwayat Perubahan Nilai
                    </div>
                    {existingGrade.editHistory.map((h, i) => (
                      <div key={i} className="text-[11px] text-slate-600">
                        {new Date(h.editedAt).toLocaleString('id-ID')} · {h.editedBy}:{' '}
                        <span className="font-mono">
                          {h.previousScore} → {h.newScore}
                        </span>{' '}
                        ({h.note})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Mode 2: Koreksi Satu Kelas Sekaligus */
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0B2447] text-white">
                  <tr>
                    <th className="px-3 py-2.5 sticky left-0 bg-[#0B2447] z-10 min-w-[180px]">
                      Nama Siswa
                    </th>
                    {Array.from({ length: totalSoal }, (_, i) => i + 1).map((n) => (
                      <th key={n} className="px-1.5 py-2.5 text-center font-mono min-w-[44px]">
                        <div>{n}</div>
                        <div className="text-[10px] text-[#EBC556] font-normal">({keyMap[String(n)]})</div>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center">Benar</th>
                    <th className="px-3 py-2.5 text-right">Nilai</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {classStudents.map((stu) => {
                    const ansMap = batchAnswers[stu.id] || {};
                    const preview = calculateScore(ansMap);
                    return (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 sticky left-0 bg-white font-semibold text-slate-900 border-r border-slate-100">
                          <div>{stu.namaLengkap}</div>
                          <div className="text-[11px] font-mono text-slate-400">NIS {stu.nis}</div>
                        </td>
                        {Array.from({ length: totalSoal }, (_, i) => i + 1).map((n) => {
                          const num = String(n);
                          const val = ansMap[num] || '';
                          return (
                            <td key={n} className="px-1 py-1.5 text-center">
                              <select
                                disabled={!canGrade}
                                value={val}
                                onChange={(e) =>
                                  setBatchAnswers((prev) => ({
                                    ...prev,
                                    [stu.id]: {
                                      ...(prev[stu.id] || {}),
                                      [num]: e.target.value,
                                    },
                                  }))
                                }
                                className={`w-11 py-1 rounded border text-center font-mono font-bold text-xs ${
                                  !val
                                    ? 'border-slate-200 text-slate-400'
                                    : val === keyMap[num]
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                    : 'border-red-300 bg-red-50 text-red-700'
                                }`}
                              >
                                <option value="">-</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-mono tabular-nums font-semibold">
                          {preview.jawabanBenar}/{totalSoal}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-[#0B2447]">
                          {preview.nilaiAkhir.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">
                          <span
                            className={
                              preview.statusKetuntasan === 'TUNTAS'
                                ? 'text-emerald-700'
                                : 'text-red-600'
                            }
                          >
                            {preview.statusKetuntasan}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {canGrade && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBatch}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60 whitespace-nowrap"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : `Simpan Nilai Seluruh Kelas ${kelas}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
