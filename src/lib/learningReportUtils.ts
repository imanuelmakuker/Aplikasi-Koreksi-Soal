import { ExamAttendance, GradingResult, Student, Subject } from '../types.ts';

export interface ComprehensiveSubjectRow {
  namaMapel: string;
  kkm: number;
  pasGanjil: number | null;
  pasGenap: number | null;
  ujianSekolah: number | null;
  rataRata: number | null;
  statusAkhir: 'TUNTAS' | 'BELUM TUNTAS' | 'BELUM DINILAI';
}

export interface ComprehensiveStudentReport {
  student: Student;
  rows: ComprehensiveSubjectRow[];
  overallAverage: number;
  gradedSubjectCount: number;
  tuntasCount: number;
  belumTuntasCount: number;
  attendanceSummary: {
    hadir: number;
    sakit: number;
    izin: number;
    tanpaKeterangan: number;
  };
}

export function buildComprehensiveStudentReport(params: {
  student: Student;
  subjects: Subject[];
  gradingResults: GradingResult[];
  attendances: ExamAttendance[];
  tahunPelajaran: string;
}): ComprehensiveStudentReport {
  const { student, subjects, gradingResults, attendances, tahunPelajaran } = params;

  const classSubjects = subjects.filter(
    (s) => s.kelas === student.kelas && s.tahunPelajaran === tahunPelajaran
  );

  // Group subjects by namaMapel across PAS Ganjil, PAS Genap, Ujian Sekolah
  const subjectNamesMap = new Map<
    string,
    { kkm: number; subjectsByExam: Record<string, Subject> }
  >();

  for (const subj of classSubjects) {
    const key = subj.namaMapel.trim();
    const existing = subjectNamesMap.get(key) ?? { kkm: subj.kkm, subjectsByExam: {} };
    existing.subjectsByExam[subj.jenisUjian] = subj;
    if (subj.kkm) existing.kkm = subj.kkm;
    subjectNamesMap.set(key, existing);
  }

  // Also include any graded subject for this student even if subject name wasn't matched above
  const stuGrades = gradingResults.filter(
    (g) => g.studentId === student.id && g.tahunPelajaran === tahunPelajaran
  );

  const findGradeScore = (subj?: Subject, jenisUjian?: string): number | null => {
    if (!subj || !jenisUjian) return null;
    const found = stuGrades.find(
      (g) => g.subjectId === subj.id && g.jenisUjian === jenisUjian
    );
    return found ? found.nilaiAkhir : null;
  };

  const rows: ComprehensiveSubjectRow[] = Array.from(subjectNamesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([namaMapel, meta]) => {
      const pasGanjil = findGradeScore(meta.subjectsByExam['PAS Ganjil'], 'PAS Ganjil');
      const pasGenap = findGradeScore(meta.subjectsByExam['PAS Genap'], 'PAS Genap');
      const ujianSekolah = findGradeScore(meta.subjectsByExam['Ujian Sekolah'], 'Ujian Sekolah');

      const available = [pasGanjil, pasGenap, ujianSekolah].filter(
        (v): v is number => v !== null
      );
      const rataRata =
        available.length > 0
          ? Number((available.reduce((sum, x) => sum + x, 0) / available.length).toFixed(2))
          : null;

      const statusAkhir: ComprehensiveSubjectRow['statusAkhir'] =
        rataRata === null
          ? 'BELUM DINILAI'
          : rataRata >= meta.kkm
          ? 'TUNTAS'
          : 'BELUM TUNTAS';

      return {
        namaMapel,
        kkm: meta.kkm,
        pasGanjil,
        pasGenap,
        ujianSekolah,
        rataRata,
        statusAkhir,
      };
    });

  const gradedRows = rows.filter((r) => r.rataRata !== null);
  const overallAverage =
    gradedRows.length > 0
      ? Number(
          (
            gradedRows.reduce((sum, r) => sum + (r.rataRata ?? 0), 0) / gradedRows.length
          ).toFixed(2)
        )
      : 0;
  const tuntasCount = gradedRows.filter((r) => r.statusAkhir === 'TUNTAS').length;
  const belumTuntasCount = gradedRows.length - tuntasCount;

  const stuAtt = attendances.filter(
    (a) => a.studentId === student.id && a.tahunPelajaran === tahunPelajaran
  );
  const attendanceSummary = {
    hadir: stuAtt.filter((a) => a.statusKehadiran === 'Hadir').length,
    sakit: stuAtt.filter((a) => a.statusKehadiran === 'Sakit').length,
    izin: stuAtt.filter((a) => a.statusKehadiran === 'Izin').length,
    tanpaKeterangan: stuAtt.filter((a) => a.statusKehadiran === 'Tanpa Keterangan').length,
  };

  return {
    student,
    rows,
    overallAverage,
    gradedSubjectCount: gradedRows.length,
    tuntasCount,
    belumTuntasCount,
    attendanceSummary,
  };
}
