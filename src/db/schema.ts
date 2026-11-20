import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export interface EditHistoryEntry {
  editedAt: string;
  editedBy: string;
  previousScore: number;
  newScore: number;
  note: string;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  username: text('username').unique(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('Guru'), // Administrator | Kepala Sekolah | Guru | Wali Kelas
  ptkId: integer('ptk_id'),
  assignedClass: text('assigned_class').default(''),
  assignedSubjects: jsonb('assigned_subjects').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const academicYears = pgTable('academic_years', {
  id: serial('id').primaryKey(),
  tahunPelajaran: text('tahun_pelajaran').notNull().unique(),
  isActive: boolean('is_active').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const schools = pgTable('schools', {
  id: serial('id').primaryKey(),
  namaSekolah: text('nama_sekolah').notNull(),
  npsn: text('npsn').notNull(),
  statusSekolah: text('status_sekolah').notNull().default('Negeri'),
  alamatSekolah: text('alamat_sekolah').notNull(),
  desaKampung: text('desa_kampung').notNull(),
  distrik: text('distrik').notNull(),
  kabupaten: text('kabupaten').notNull(),
  provinsi: text('provinsi').notNull(),
  kodePos: text('kode_pos').notNull(),
  tahunPelajaran: text('tahun_pelajaran').notNull(),
  logoSekolah: text('logo_sekolah').default(''),
  namaKepalaSekolah: text('nama_kepala_sekolah').notNull(),
  nipKepalaSekolah: text('nip_kepala_sekolah').notNull(),
  ttdKepalaSekolah: text('ttd_kepala_sekolah').default(''),
  tempatTanggal: text('tempat_tanggal').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ptk = pgTable('ptk', {
  id: serial('id').primaryKey(),
  namaLengkap: text('nama_lengkap').notNull(),
  nip: text('nip').notNull().default(''),
  nuptk: text('nuptk').notNull().default(''),
  pangkatGolongan: text('pangkat_golongan').notNull().default(''),
  jabatan: text('jabatan').notNull().default(''),
  statusKepegawaian: text('status_kepegawaian').notNull().default('PNS'),
  mataPelajaranDiampu: text('mata_pelajaran_diampu').notNull().default(''),
  isKepalaSekolah: boolean('is_kepala_sekolah').notNull().default(false),
  isWaliKelas: boolean('is_wali_kelas').notNull().default(false),
  waliKelasUntuk: text('wali_kelas_untuk').notNull().default(''),
  isGuruKelas: boolean('is_guru_kelas').notNull().default(false),
  ttdDigital: text('ttd_digital').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const students = pgTable(
  'students',
  {
    id: serial('id').primaryKey(),
    nis: text('nis').notNull(),
    nisn: text('nisn').notNull(),
    namaLengkap: text('nama_lengkap').notNull(),
    jenisKelamin: text('jenis_kelamin').notNull().default('L'),
    tempatTanggalLahir: text('tempat_tanggal_lahir').notNull().default(''),
    kelas: text('kelas').notNull(),
    tahunPelajaran: text('tahun_pelajaran').notNull(),
    namaWaliKelas: text('nama_wali_kelas').notNull().default(''),
    alamat: text('alamat').notNull().default(''),
    statusSiswa: text('status_siswa').notNull().default('Aktif'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('students_nis_tahun_idx').on(table.nis, table.tahunPelajaran),
  ]
);

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  kodeMapel: text('kode_mapel').notNull(),
  namaMapel: text('nama_mapel').notNull(),
  kelas: text('kelas').notNull(),
  namaGuruPengampu: text('nama_guru_pengampu').notNull(),
  kkm: integer('kkm').notNull().default(70),
  jumlahSoal: integer('jumlah_soal').notNull().default(40),
  jenisUjian: text('jenis_ujian').notNull(), // PAS Ganjil | PAS Genap | Ujian Sekolah
  tahunPelajaran: text('tahun_pelajaran').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const examPapers = pgTable(
  'exam_papers',
  {
    id: serial('id').primaryKey(),
    jenisUjian: text('jenis_ujian').notNull(),
    tahunPelajaran: text('tahun_pelajaran').notNull(),
    kelas: text('kelas').notNull(),
    subjectId: integer('subject_id')
      .references(() => subjects.id, { onDelete: 'cascade' })
      .notNull(),
    namaMataPelajaran: text('nama_mata_pelajaran').notNull(),
    guruPengampu: text('guru_pengampu').notNull(),
    jumlahSoal: integer('jumlah_soal').notNull(),
    tipePenilaian: text('tipe_penilaian').notNull().default('Pilihan Ganda A-D'), // Pilihan Ganda A-D | Isian | Uraian
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('exam_papers_unique_idx').on(
      table.jenisUjian,
      table.tahunPelajaran,
      table.kelas,
      table.subjectId
    ),
  ]
);

export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    examPaperId: integer('exam_paper_id')
      .references(() => examPapers.id, { onDelete: 'cascade' })
      .notNull(),
    nomorSoal: integer('nomor_soal').notNull(),
    tipeSoal: text('tipe_soal').notNull().default('Pilihan Ganda A-D'),
    pertanyaan: text('pertanyaan').notNull().default(''),
    opsiA: text('opsi_a').notNull().default(''),
    opsiB: text('opsi_b').notNull().default(''),
    opsiC: text('opsi_c').notNull().default(''),
    opsiD: text('opsi_d').notNull().default(''),
    kunciJawaban: text('kunci_jawaban').notNull().default(''),
    bobot: integer('bobot').notNull().default(1),
  },
  (table) => [
    uniqueIndex('questions_paper_num_idx').on(table.examPaperId, table.nomorSoal),
  ]
);

export const gradingResults = pgTable(
  'grading_results',
  {
    id: serial('id').primaryKey(),
    examPaperId: integer('exam_paper_id')
      .references(() => examPapers.id, { onDelete: 'set null' }),
    studentId: integer('student_id')
      .references(() => students.id, { onDelete: 'cascade' })
      .notNull(),
    subjectId: integer('subject_id')
      .references(() => subjects.id, { onDelete: 'cascade' })
      .notNull(),
    jenisUjian: text('jenis_ujian').notNull(),
    tahunPelajaran: text('tahun_pelajaran').notNull(),
    kelas: text('kelas').notNull(),
    jawabanSiswa: jsonb('jawaban_siswa').$type<Record<string, string>>().notNull().default({}),
    jumlahSoal: integer('jumlah_soal').notNull(),
    jawabanBenar: integer('jawaban_benar').notNull(),
    jawabanSalah: integer('jawaban_salah').notNull(),
    tidakDijawab: integer('tidak_dijawab').notNull(),
    nilaiAkhir: doublePrecision('nilai_akhir').notNull(),
    kkm: integer('kkm').notNull().default(70),
    statusKetuntasan: text('status_ketuntasan').notNull(), // TUNTAS | BELUM TUNTAS
    gradedBy: text('graded_by').notNull(),
    editHistory: jsonb('edit_history').$type<EditHistoryEntry[]>().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('grading_results_unique_idx').on(
      table.studentId,
      table.subjectId,
      table.jenisUjian,
      table.tahunPelajaran
    ),
  ]
);

export const examAttendances = pgTable(
  'exam_attendances',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .references(() => students.id, { onDelete: 'cascade' })
      .notNull(),
    subjectId: integer('subject_id')
      .references(() => subjects.id, { onDelete: 'cascade' })
      .notNull(),
    jenisUjian: text('jenis_ujian').notNull(),
    tahunPelajaran: text('tahun_pelajaran').notNull(),
    kelas: text('kelas').notNull(),
    tanggalUjian: text('tanggal_ujian').notNull(),
    statusKehadiran: text('status_kehadiran').notNull().default('Hadir'), // Hadir | Sakit | Izin | Tanpa Keterangan
    recordedBy: text('recorded_by').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('exam_attendances_unique_idx').on(
      table.studentId,
      table.subjectId,
      table.jenisUjian,
      table.tahunPelajaran,
      table.tanggalUjian
    ),
  ]
);

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  module: text('module').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const examPapersRelations = relations(examPapers, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [examPapers.subjectId],
    references: [subjects.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  examPaper: one(examPapers, {
    fields: [questions.examPaperId],
    references: [examPapers.id],
  }),
}));

export const gradingResultsRelations = relations(gradingResults, ({ one }) => ({
  student: one(students, {
    fields: [gradingResults.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [gradingResults.subjectId],
    references: [subjects.id],
  }),
}));

export const examAttendancesRelations = relations(examAttendances, ({ one }) => ({
  student: one(students, {
    fields: [examAttendances.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [examAttendances.subjectId],
    references: [subjects.id],
  }),
}));
