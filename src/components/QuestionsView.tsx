import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { downloadAnswerKeyTemplate, parseAnswerKeyExcel } from '../lib/excelUtils.ts';
import { ExamPaper, ExamType, Question, Subject, UserRole } from '../types.ts';

interface QuestionsViewProps {
  subjects: Subject[];
  examPapers: ExamPaper[];
  tahunPelajaran: string;
  userRole: UserRole;
  onSavePaper: (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    subjectId: number;
    namaMataPelajaran: string;
    guruPengampu: string;
    jumlahSoal: number;
    tipePenilaian: string;
    questionsList: Question[];
  }) => Promise<void>;
  onDuplicatePaper: (
    sourcePaperId: number,
    targetJenisUjian: string,
    targetTahunPelajaran: string
  ) => Promise<void>;
  onDeletePaper: (id: number) => Promise<void>;
}

const EXAM_TYPES: ExamType[] = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];

export function QuestionsView({
  subjects,
  examPapers,
  tahunPelajaran,
  userRole,
  onSavePaper,
  onDuplicatePaper,
  onDeletePaper,
}: QuestionsViewProps) {
  const canEdit = userRole === 'Administrator' || userRole === 'Guru';

  const [jenisUjian, setJenisUjian] = useState<string>('PAS Ganjil');
  const [kelas, setKelas] = useState<string>('VI');

  const availableSubjects = useMemo(() => {
    return subjects.filter((s) => s.jenisUjian === jenisUjian && s.kelas === kelas);
  }, [subjects, jenisUjian, kelas]);

  const [subjectId, setSubjectId] = useState<number>(0);

  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === subjectId)) {
        setSubjectId(availableSubjects[0].id);
      }
    } else {
      setSubjectId(0);
    }
  }, [availableSubjects, subjectId]);

  const selectedSubject = availableSubjects.find((s) => s.id === subjectId) || null;
  const existingPaper = examPapers.find(
    (p) =>
      p.jenisUjian === jenisUjian &&
      p.tahunPelajaran === tahunPelajaran &&
      p.kelas === kelas &&
      p.subjectId === subjectId
  );

  const [guruPengampu, setGuruPengampu] = useState('');
  const [jumlahSoal, setJumlahSoal] = useState<number>(10);
  const [tipePenilaian, setTipePenilaian] = useState<string>('Pilihan Ganda A-D');
  const [questionsList, setQuestionsList] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [dupTargetExam, setDupTargetExam] = useState<string>('PAS Genap');
  const [showFullEditor, setShowFullEditor] = useState(false);

  useEffect(() => {
    if (existingPaper) {
      setGuruPengampu(existingPaper.guruPengampu);
      setJumlahSoal(existingPaper.jumlahSoal);
      setTipePenilaian(existingPaper.tipePenilaian || 'Pilihan Ganda A-D');
      const mapped = Array.from({ length: existingPaper.jumlahSoal }, (_, i) => {
        const num = i + 1;
        const found = existingPaper.questions.find((q) => q.nomorSoal === num);
        return (
          found || {
            nomorSoal: num,
            tipeSoal: existingPaper.tipePenilaian || 'Pilihan Ganda A-D',
            pertanyaan: `Soal Nomor ${num}`,
            opsiA: '',
            opsiB: '',
            opsiC: '',
            opsiD: '',
            kunciJawaban: '',
            bobot: 1,
          }
        );
      });
      setQuestionsList(mapped);
    } else if (selectedSubject) {
      setGuruPengampu(selectedSubject.namaGuruPengampu);
      const count = selectedSubject.jumlahSoal || 10;
      setJumlahSoal(count);
      setTipePenilaian('Pilihan Ganda A-D');
      setQuestionsList(
        Array.from({ length: count }, (_, i) => ({
          nomorSoal: i + 1,
          tipeSoal: 'Pilihan Ganda A-D',
          pertanyaan: `Soal Nomor ${i + 1}`,
          opsiA: '',
          opsiB: '',
          opsiC: '',
          opsiD: '',
          kunciJawaban: '',
          bobot: 1,
        }))
      );
    } else {
      setQuestionsList([]);
    }
  }, [existingPaper?.id, selectedSubject?.id]);

  const handleResizeQuestions = (newCount: number) => {
    const safeCount = Math.max(1, Math.min(100, newCount));
    setJumlahSoal(safeCount);
    setQuestionsList((prev) =>
      Array.from({ length: safeCount }, (_, i) => {
        const num = i + 1;
        return (
          prev.find((q) => q.nomorSoal === num) || {
            nomorSoal: num,
            tipeSoal: tipePenilaian,
            pertanyaan: `Soal Nomor ${num}`,
            opsiA: '',
            opsiB: '',
            opsiC: '',
            opsiD: '',
            kunciJawaban: '',
            bobot: 1,
          }
        );
      })
    );
  };

  const setKeyForNumber = (nomor: number, kunci: string) => {
    setQuestionsList((prev) =>
      prev.map((q) => (q.nomorSoal === nomor ? { ...q, kunciJawaban: kunci } : q))
    );
  };

  const updateQuestionField = (nomor: number, field: keyof Question, val: string) => {
    setQuestionsList((prev) =>
      prev.map((q) => (q.nomorSoal === nomor ? { ...q, [field]: val } : q))
    );
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice(null);
    try {
      const parsed = await parseAnswerKeyExcel(file);
      if (parsed.length === 0) {
        setNotice({ type: 'error', msg: 'File Excel tidak memiliki baris kunci jawaban yang valid.' });
        return;
      }
      setJumlahSoal(parsed.length);
      setQuestionsList(
        parsed.map((p) => ({
          nomorSoal: p.nomorSoal,
          tipeSoal: tipePenilaian,
          pertanyaan: p.pertanyaan,
          opsiA: p.opsiA,
          opsiB: p.opsiB,
          opsiC: p.opsiC,
          opsiD: p.opsiD,
          kunciJawaban: p.kunciJawaban,
          bobot: 1,
        }))
      );
      setNotice({
        type: 'success',
        msg: `Berhasil memuat ${parsed.length} kunci jawaban dari Excel. Klik Simpan Kunci Jawaban untuk menyimpan permanen.`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message || 'Gagal membaca file Excel.' });
    } finally {
      e.target.value = '';
    }
  };

  const filledCount = questionsList.filter((q) => q.kunciJawaban.trim() !== '').length;

  const handleSave = async () => {
    if (!selectedSubject) return;
    setNotice(null);
    if (tipePenilaian === 'Pilihan Ganda A-D') {
      const missing = questionsList.filter((q) => !['A', 'B', 'C', 'D'].includes(q.kunciJawaban));
      if (missing.length > 0) {
        setNotice({
          type: 'error',
          msg: `Validasi gagal: Nomor soal ${missing
            .slice(0, 5)
            .map((m) => m.nomorSoal)
            .join(', ')}${missing.length > 5 ? ', ...' : ''} belum memiliki kunci jawaban A/B/C/D.`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      await onSavePaper({
        jenisUjian,
        tahunPelajaran,
        kelas,
        subjectId: selectedSubject.id,
        namaMataPelajaran: selectedSubject.namaMapel,
        guruPengampu: guruPengampu || selectedSubject.namaGuruPengampu,
        jumlahSoal,
        tipePenilaian,
        questionsList,
      });
      setNotice({
        type: 'success',
        msg: `Kunci jawaban ${selectedSubject.namaMapel} Kelas ${kelas} (${jenisUjian}) berhasil disimpan (${jumlahSoal} soal).`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!existingPaper) return;
    setNotice(null);
    try {
      await onDuplicatePaper(existingPaper.id, dupTargetExam, tahunPelajaran);
      setNotice({
        type: 'success',
        msg: `Paket soal berhasil diduplikasi ke ${dupTargetExam} (${tahunPelajaran}).`,
      });
    } catch (err: any) {
      setNotice({ type: 'error', msg: err.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0B2447] text-[#EBC556]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2447]">Input Soal dan Kunci Jawaban</h2>
              <p className="text-xs text-slate-500">
                Kelola paket soal dan kunci jawaban A, B, C, D untuk digunakan pada koreksi otomatis.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadAnswerKeyTemplate(jumlahSoal)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Template Excel
            </button>
            {canEdit && (
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                Import Excel Kunci
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
              </label>
            )}
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {availableSubjects.length === 0 ? (
                <option value={0}>-- Belum ada mapel untuk kelas &amp; ujian ini --</option>
              ) : (
                availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.namaMapel} ({s.kodeMapel})
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Penilaian</label>
            <select
              disabled={!canEdit}
              value={tipePenilaian}
              onChange={(e) => setTipePenilaian(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="Pilihan Ganda A-D">Pilihan Ganda A-D</option>
              <option value="Isian">Isian (Manual)</option>
              <option value="Uraian">Uraian (Manual)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Soal</label>
            <input
              type="number"
              min={1}
              max={100}
              disabled={!canEdit}
              value={jumlahSoal}
              onChange={(e) => handleResizeQuestions(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono tabular-nums"
            />
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

        {!selectedSubject ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
            Silakan tambahkan Mata Pelajaran terlebih dahulu pada menu{' '}
            <span className="font-semibold text-[#0B2447]">Data Mata Pelajaran</span> untuk Kelas{' '}
            {kelas} ({jenisUjian}).
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <span>
                  Guru Pengampu: <strong className="text-[#0B2447]">{guruPengampu || '-'}</strong>
                </span>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  Kunci Terisi:{' '}
                  <strong
                    className={
                      filledCount === jumlahSoal ? 'text-emerald-700' : 'text-amber-700'
                    }
                  >
                    {filledCount} / {jumlahSoal}
                  </strong>
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#0B2447] font-semibold">
                  <input
                    type="checkbox"
                    checked={showFullEditor}
                    onChange={(e) => setShowFullEditor(e.target.checked)}
                  />
                  Tampilkan Teks Soal &amp; Opsi Lengkap
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleResizeQuestions(jumlahSoal + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah 1 Soal
                  </button>
                )}
                {existingPaper && canEdit && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={dupTargetExam}
                      onChange={(e) => setDupTargetExam(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    >
                      {EXAM_TYPES.map((ex) => (
                        <option key={ex} value={ex}>
                          Ke {ex}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleDuplicate}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-[#0B2447] text-xs font-bold whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplikasi Soal
                    </button>
                  </div>
                )}
                {existingPaper && canEdit && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeletePaper(existingPaper.id);
                      setNotice({ type: 'success', msg: 'Paket soal dihapus.' });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Paket
                  </button>
                )}
              </div>
            </div>

            {/* Matrix / Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0B2447] text-white text-xs">
                  <tr>
                    <th className="px-4 py-2.5 w-16 text-center">No</th>
                    {showFullEditor && <th className="px-4 py-2.5">Teks Pertanyaan &amp; Opsi</th>}
                    <th className="px-4 py-2.5">
                      {tipePenilaian === 'Pilihan Ganda A-D'
                        ? 'Pilih Kunci Jawaban (A / B / C / D)'
                        : 'Pedoman Kunci Jawaban'}
                    </th>
                    <th className="px-4 py-2.5 w-28 text-center">Kunci Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {questionsList.map((q) => (
                    <tr key={q.nomorSoal} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 text-center font-mono tabular-nums font-bold text-[#0B2447]">
                        {q.nomorSoal}
                      </td>
                      {showFullEditor && (
                        <td className="px-4 py-2.5 space-y-2 min-w-[280px]">
                          <input
                            type="text"
                            disabled={!canEdit}
                            value={q.pertanyaan}
                            onChange={(e) =>
                              updateQuestionField(q.nomorSoal, 'pertanyaan', e.target.value)
                            }
                            placeholder={`Tulis soal nomor ${q.nomorSoal}...`}
                            className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                          />
                          {tipePenilaian === 'Pilihan Ganda A-D' && (
                            <div className="grid grid-cols-2 gap-1.5">
                              {(['opsiA', 'opsiB', 'opsiC', 'opsiD'] as const).map((op, i) => (
                                <input
                                  key={op}
                                  type="text"
                                  disabled={!canEdit}
                                  value={q[op]}
                                  onChange={(e) =>
                                    updateQuestionField(q.nomorSoal, op, e.target.value)
                                  }
                                  placeholder={`Opsi ${['A', 'B', 'C', 'D'][i]}`}
                                  className="px-2 py-1 rounded border border-slate-200 text-xs"
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        {tipePenilaian === 'Pilihan Ganda A-D' ? (
                          <div className="flex items-center gap-2">
                            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                disabled={!canEdit}
                                onClick={() => setKeyForNumber(q.nomorSoal, opt)}
                                className={`w-10 h-8 rounded-md font-mono font-bold text-xs border transition-colors ${
                                  q.kunciJawaban === opt
                                    ? 'bg-[#0B2447] text-[#EBC556] border-[#0B2447]'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            disabled={!canEdit}
                            value={q.kunciJawaban}
                            onChange={(e) => setKeyForNumber(q.nomorSoal, e.target.value)}
                            placeholder="Masukkan pedoman jawaban isian/uraian..."
                            className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs"
                          />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {q.kunciJawaban ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {q.kunciJawaban}
                          </span>
                        ) : (
                          <span className="text-xs text-red-500">Kosong</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                >
                  <Save className="w-4 h-4 text-[#EBC556]" />
                  {saving ? 'Menyimpan...' : 'Simpan Kunci Jawaban'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
