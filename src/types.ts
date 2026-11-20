export type UserRole = 'Administrator' | 'Kepala Sekolah' | 'Guru' | 'Wali Kelas';

export type ExamType = 'PAS Ganjil' | 'PAS Genap' | 'Ujian Sekolah';

export type NavSection =
  | 'dashboard'
  | 'school'
  | 'ptk'
  | 'students'
  | 'subjects'
  | 'questions'
  | 'grading'
  | 'attendance'
  | 'grades'
  | 'recap'
  | 'learning-report'
  | 'pdf'
  | 'settings';

export interface AppUser {
  id: number;
  uid: string;
  username: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  ptkId: number | null;
  assignedClass: string;
  assignedSubjects: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface School {
  id: number;
  namaSekolah: string;
  npsn: string;
  statusSekolah: string;
  alamatSekolah: string;
  desaKampung: string;
  distrik: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  tahunPelajaran: string;
  logoSekolah: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  ttdKepalaSekolah: string;
  tempatTanggal: string;
  updatedAt?: string;
}

export interface AcademicYear {
  id: number;
  tahunPelajaran: string;
  isActive: boolean;
  isArchived: boolean;
}

export interface Ptk {
  id: number;
  namaLengkap: string;
  nip: string;
  nuptk: string;
  pangkatGolongan: string;
  jabatan: string;
  statusKepegawaian: string;
  mataPelajaranDiampu: string;
  isKepalaSekolah: boolean;
  isWaliKelas: boolean;
  waliKelasUntuk: string;
  isGuruKelas: boolean;
  ttdDigital: string;
}

export interface Student {
  id: number;
  nis: string;
  nisn: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P' | string;
  tempatTanggalLahir: string;
  kelas: string;
  tahunPelajaran: string;
  namaWaliKelas: string;
  alamat: string;
  statusSiswa: string;
}

export interface Subject {
  id: number;
  kodeMapel: string;
  namaMapel: string;
  kelas: string;
  namaGuruPengampu: string;
  kkm: number;
  jumlahSoal: number;
  jenisUjian: ExamType | string;
  tahunPelajaran: string;
}

export interface Question {
  id?: number;
  examPaperId?: number;
  nomorSoal: number;
  tipeSoal: string;
  pertanyaan: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  kunciJawaban: string;
  bobot: number;
}

export interface ExamPaper {
  id: number;
  jenisUjian: ExamType | string;
  tahunPelajaran: string;
  kelas: string;
  subjectId: number;
  namaMataPelajaran: string;
  guruPengampu: string;
  jumlahSoal: number;
  tipePenilaian: string;
  questions: Question[];
  updatedAt?: string;
}

export interface EditHistoryEntry {
  editedAt: string;
  editedBy: string;
  previousScore: number;
  newScore: number;
  note: string;
}

export interface GradingResult {
  id: number;
  examPaperId: number | null;
  studentId: number;
  subjectId: number;
  jenisUjian: string;
  tahunPelajaran: string;
  kelas: string;
  jawabanSiswa: Record<string, string>;
  jumlahSoal: number;
  jawabanBenar: number;
  jawabanSalah: number;
  tidakDijawab: number;
  nilaiAkhir: number;
  kkm: number;
  statusKetuntasan: 'TUNTAS' | 'BELUM TUNTAS' | string;
  gradedBy: string;
  editHistory: EditHistoryEntry[];
  updatedAt?: string;
}

export interface ExamAttendance {
  id: number;
  studentId: number;
  subjectId: number;
  jenisUjian: string;
  tahunPelajaran: string;
  kelas: string;
  tanggalUjian: string;
  statusKehadiran: 'Hadir' | 'Sakit' | 'Izin' | 'Tanpa Keterangan' | string;
  recordedBy: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: number;
  userId: number | null;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
  createdAt: string;
}

export interface DashboardData {
  kpi: {
    totalSiswa: number;
    totalGuru: number;
    totalMapel: number;
    totalSoal: number;
    totalHasilKoreksi: number;
    totalPesertaUjian: number;
    siswaTuntas: number;
    siswaBelumTuntas: number;
    persentaseKetuntasan: number;
  };
  charts: {
    distribution: Record<string, number>;
    averageBySubject: Array<{ subjectName: string; average: number; count: number }>;
    averageByClass: Array<{ kelas: string; average: number; gradedCount: number; studentCount: number }>;
    comparisonByExamType: Array<{
      jenisUjian: string;
      totalGraded: number;
      average: number;
      passRate: number;
    }>;
    attendanceStats: {
      total: number;
      Hadir: number;
      Sakit: number;
      Izin: number;
      'Tanpa Keterangan': number;
    };
  };
  recentLogs: ActivityLog[];
}
