import dotenv from 'dotenv';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './src/db/index.ts';
import {
  getActiveSchool,
  getAllAcademicYears,
  getAllPtk,
  getAllUsersSafe,
  getExamPapersWithQuestions,
  getStudentsByYear,
  getSubjectsByYear,
  logActivity,
  upsertGradingResult,
} from './src/db/queries.ts';
import {
  academicYears,
  activityLogs,
  examAttendances,
  examPapers,
  gradingResults,
  ptk,
  questions,
  schools,
  students,
  subjects,
  users,
} from './src/db/schema.ts';
import { ensureInitialSeed } from './src/db/seed.ts';
import { hashPassword, signLocalToken, verifyPassword } from './src/lib/auth-utils.ts';
import { type AuthRequest, requireAuth, requireRole, type UserRole } from './src/middleware/auth.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

function computeAutoGrade(
  answerKeys: Record<string, string>,
  studentAnswers: Record<string, string>,
  totalQuestions: number,
  kkm: number
) {
  let benar = 0;
  let salah = 0;
  let tidakDijawab = 0;

  for (let i = 1; i <= totalQuestions; i++) {
    const num = String(i);
    const key = (answerKeys[num] || '').trim().toUpperCase();
    const ans = (studentAnswers[num] || '').trim().toUpperCase();
    if (!ans) {
      tidakDijawab++;
    } else if (key && ans === key) {
      benar++;
    } else {
      salah++;
    }
  }

  const rawScore = totalQuestions > 0 ? (benar / totalQuestions) * 100 : 0;
  const clamped = Math.max(0, Math.min(100, rawScore));
  const nilaiAkhir = Number(clamped.toFixed(2));
  const statusKetuntasan = nilaiAkhir >= kkm ? 'TUNTAS' : 'BELUM TUNTAS';

  return {
    jumlahSoal: totalQuestions,
    jawabanBenar: benar,
    jawabanSalah: salah,
    tidakDijawab,
    nilaiAkhir,
    kkm,
    statusKetuntasan,
  };
}

// ============================================================================
// AUTH ROUTES
// ============================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    await ensureInitialSeed();
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const found = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim()))
      .limit(1);

    if (found.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const user = found[0];
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Akun ini telah dinonaktifkan oleh Administrator.' });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const token = signLocalToken({
      uid: user.uid,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logActivity({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'Login',
      module: 'Autentikasi',
      details: `${user.fullName} (${user.role}) masuk ke sistem.`,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        ptkId: user.ptkId,
        assignedClass: user.assignedClass || '',
        assignedSubjects: user.assignedSubjects || [],
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat proses login.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  return res.json({ user: req.appUser });
});

// ============================================================================
// BOOTSTRAP & DASHBOARD
// ============================================================================
app.get('/api/bootstrap', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureInitialSeed();
    const [school, years, allPtk] = await Promise.all([
      getActiveSchool(),
      getAllAcademicYears(),
      getAllPtk(),
    ]);
    return res.json({
      user: req.appUser,
      school,
      academicYears: years,
      ptk: allPtk,
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    return res.status(500).json({ error: 'Gagal memuat konfigurasi awal aplikasi.' });
  }
});

app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureInitialSeed();
    const tahunPelajaran = String(req.query.tahunPelajaran || '2026/2027');

    const [allStudents, allPtk, allSubjects, papers, grades, attendances, logs] = await Promise.all([
      getStudentsByYear(tahunPelajaran),
      getAllPtk(),
      getSubjectsByYear(tahunPelajaran),
      getExamPapersWithQuestions(tahunPelajaran),
      db.select().from(gradingResults).where(eq(gradingResults.tahunPelajaran, tahunPelajaran)),
      db.select().from(examAttendances).where(eq(examAttendances.tahunPelajaran, tahunPelajaran)),
      db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(15),
    ]);

    const activeStudents = allStudents.filter((s) => s.statusSiswa === 'Aktif');
    const totalQuestions = papers.reduce((sum, p) => sum + (p.questions?.length || 0), 0);

    const tuntasCount = grades.filter((g) => g.statusKetuntasan === 'TUNTAS').length;
    const belumTuntasCount = grades.filter((g) => g.statusKetuntasan === 'BELUM TUNTAS').length;
    const persentaseKetuntasan =
      grades.length > 0 ? Number(((tuntasCount / grades.length) * 100).toFixed(2)) : 0;

    // Distinct participants graded or attended
    const participantIds = new Set<number>([
      ...grades.map((g) => g.studentId),
      ...attendances.filter((a) => a.statusKehadiran === 'Hadir').map((a) => a.studentId),
    ]);

    // Score distribution buckets
    const buckets = {
      '90-100': grades.filter((g) => g.nilaiAkhir >= 90).length,
      '80-89': grades.filter((g) => g.nilaiAkhir >= 80 && g.nilaiAkhir < 90).length,
      '70-79': grades.filter((g) => g.nilaiAkhir >= 70 && g.nilaiAkhir < 80).length,
      '60-69': grades.filter((g) => g.nilaiAkhir >= 60 && g.nilaiAkhir < 70).length,
      '<60': grades.filter((g) => g.nilaiAkhir < 60).length,
    };

    // Average per subject name
    const subjectMap = new Map<number, string>();
    allSubjects.forEach((s) => subjectMap.set(s.id, s.namaMapel));

    const subjectAccum = new Map<string, { sum: number; count: number }>();
    for (const g of grades) {
      const name = subjectMap.get(g.subjectId) || 'Lainnya';
      const cur = subjectAccum.get(name) ?? { sum: 0, count: 0 };
      cur.sum += g.nilaiAkhir;
      cur.count += 1;
      subjectAccum.set(name, cur);
    }
    const averageBySubject = Array.from(subjectAccum.entries()).map(([subjectName, v]) => ({
      subjectName,
      average: Number((v.sum / v.count).toFixed(2)),
      count: v.count,
    }));

    // Average per class
    const classOrder = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    const averageByClass = classOrder.map((kelas) => {
      const classGrades = grades.filter((g) => g.kelas === kelas);
      const avg =
        classGrades.length > 0
          ? Number(
              (classGrades.reduce((s, x) => s + x.nilaiAkhir, 0) / classGrades.length).toFixed(2)
            )
          : 0;
      const studentCount = activeStudents.filter((s) => s.kelas === kelas).length;
      return { kelas, average: avg, gradedCount: classGrades.length, studentCount };
    });

    // Comparison PAS Ganjil vs PAS Genap vs Ujian Sekolah
    const examTypes = ['PAS Ganjil', 'PAS Genap', 'Ujian Sekolah'];
    const comparisonByExamType = examTypes.map((jenisUjian) => {
      const rows = grades.filter((g) => g.jenisUjian === jenisUjian);
      const avg =
        rows.length > 0
          ? Number((rows.reduce((s, r) => s + r.nilaiAkhir, 0) / rows.length).toFixed(2))
          : 0;
      const tuntas = rows.filter((r) => r.statusKetuntasan === 'TUNTAS').length;
      return {
        jenisUjian,
        totalGraded: rows.length,
        average: avg,
        passRate: rows.length > 0 ? Number(((tuntas / rows.length) * 100).toFixed(1)) : 0,
      };
    });

    // Attendance statistics
    const attendanceStats = {
      total: attendances.length,
      Hadir: attendances.filter((a) => a.statusKehadiran === 'Hadir').length,
      Sakit: attendances.filter((a) => a.statusKehadiran === 'Sakit').length,
      Izin: attendances.filter((a) => a.statusKehadiran === 'Izin').length,
      'Tanpa Keterangan': attendances.filter((a) => a.statusKehadiran === 'Tanpa Keterangan').length,
    };

    return res.json({
      kpi: {
        totalSiswa: activeStudents.length,
        totalGuru: allPtk.length,
        totalMapel: allSubjects.length,
        totalSoal: totalQuestions,
        totalHasilKoreksi: grades.length,
        totalPesertaUjian: participantIds.size,
        siswaTuntas: tuntasCount,
        siswaBelumTuntas: belumTuntasCount,
        persentaseKetuntasan,
      },
      charts: {
        distribution: buckets,
        averageBySubject,
        averageByClass,
        comparisonByExamType,
        attendanceStats,
      },
      recentLogs: logs,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Gagal memuat statistik dashboard.' });
  }
});

// ============================================================================
// DATA SEKOLAH & TAHUN PELAJARAN
// ============================================================================
app.get('/api/school', requireAuth, async (_req, res) => {
  try {
    const school = await getActiveSchool();
    return res.json({ school });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Gagal memuat data sekolah.' });
  }
});

app.put('/api/school', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const payload = req.body;
    const existing = await getActiveSchool();

    if (!payload.namaSekolah || !payload.npsn) {
      return res.status(400).json({ error: 'Nama sekolah dan NPSN wajib diisi.' });
    }

    let saved;
    if (existing) {
      const updated = await db
        .update(schools)
        .set({
          namaSekolah: payload.namaSekolah,
          npsn: payload.npsn,
          statusSekolah: payload.statusSekolah || 'Negeri',
          alamatSekolah: payload.alamatSekolah || '',
          desaKampung: payload.desaKampung || '',
          distrik: payload.distrik || '',
          kabupaten: payload.kabupaten || '',
          provinsi: payload.provinsi || '',
          kodePos: payload.kodePos || '',
          tahunPelajaran: payload.tahunPelajaran || '2026/2027',
          logoSekolah: payload.logoSekolah ?? existing.logoSekolah ?? '',
          namaKepalaSekolah: payload.namaKepalaSekolah || '',
          nipKepalaSekolah: payload.nipKepalaSekolah || '',
          ttdKepalaSekolah: payload.ttdKepalaSekolah ?? existing.ttdKepalaSekolah ?? '',
          tempatTanggal: payload.tempatTanggal || '',
          updatedAt: new Date(),
        })
        .where(eq(schools.id, existing.id))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(schools)
        .values({
          namaSekolah: payload.namaSekolah,
          npsn: payload.npsn,
          statusSekolah: payload.statusSekolah || 'Negeri',
          alamatSekolah: payload.alamatSekolah || '',
          desaKampung: payload.desaKampung || '',
          distrik: payload.distrik || '',
          kabupaten: payload.kabupaten || '',
          provinsi: payload.provinsi || '',
          kodePos: payload.kodePos || '',
          tahunPelajaran: payload.tahunPelajaran || '2026/2027',
          logoSekolah: payload.logoSekolah || '',
          namaKepalaSekolah: payload.namaKepalaSekolah || '',
          nipKepalaSekolah: payload.nipKepalaSekolah || '',
          ttdKepalaSekolah: payload.ttdKepalaSekolah || '',
          tempatTanggal: payload.tempatTanggal || '',
        })
        .returning();
      saved = inserted[0];
    }

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Simpan Data Sekolah',
      module: 'Data Sekolah',
      details: `Memperbarui identitas sekolah ${saved.namaSekolah}.`,
    });

    return res.json({ school: saved });
  } catch (error) {
    console.error('Update school error:', error);
    return res.status(500).json({ error: 'Gagal menyimpan data sekolah.' });
  }
});

app.get('/api/academic-years', requireAuth, async (_req, res) => {
  try {
    const years = await getAllAcademicYears();
    return res.json({ academicYears: years });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/academic-years', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const { tahunPelajaran } = req.body;
    if (!tahunPelajaran || typeof tahunPelajaran !== 'string') {
      return res.status(400).json({ error: 'Format tahun pelajaran tidak valid.' });
    }
    const inserted = await db
      .insert(academicYears)
      .values({ tahunPelajaran: tahunPelajaran.trim(), isActive: false, isArchived: false })
      .returning();

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Tambah Tahun Pelajaran',
      module: 'Pengaturan',
      details: `Menambahkan arsip tahun pelajaran ${tahunPelajaran.trim()}.`,
    });

    return res.json({ academicYear: inserted[0] });
  } catch (error) {
    console.error('Create academic year error:', error);
    return res.status(400).json({ error: 'Tahun pelajaran sudah terdaftar atau tidak valid.' });
  }
});

app.put(
  '/api/academic-years/:id/activate',
  requireAuth,
  requireRole('Administrator'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const target = await db.select().from(academicYears).where(eq(academicYears.id, id)).limit(1);
      if (target.length === 0) {
        return res.status(404).json({ error: 'Tahun pelajaran tidak ditemukan.' });
      }

      await db.update(academicYears).set({ isActive: false });
      const updated = await db
        .update(academicYears)
        .set({ isActive: true, isArchived: false })
        .where(eq(academicYears.id, id))
        .returning();

      const school = await getActiveSchool();
      if (school) {
        await db
          .update(schools)
          .set({ tahunPelajaran: updated[0].tahunPelajaran, updatedAt: new Date() })
          .where(eq(schools.id, school.id));
      }

      return res.json({ academicYear: updated[0] });
    } catch (error) {
      console.error('Activate academic year error:', error);
      return res.status(500).json({ error: 'Gagal mengaktifkan tahun pelajaran.' });
    }
  }
);

// ============================================================================
// DATA PTK
// ============================================================================
app.get('/api/ptk', requireAuth, async (_req, res) => {
  try {
    const rows = await getAllPtk();
    return res.json({ ptk: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/ptk', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const b = req.body;
    if (!b.namaLengkap?.trim()) {
      return res.status(400).json({ error: 'Nama lengkap PTK wajib diisi.' });
    }
    const inserted = await db
      .insert(ptk)
      .values({
        namaLengkap: b.namaLengkap.trim(),
        nip: b.nip || '',
        nuptk: b.nuptk || '',
        pangkatGolongan: b.pangkatGolongan || '',
        jabatan: b.jabatan || '',
        statusKepegawaian: b.statusKepegawaian || 'PNS',
        mataPelajaranDiampu: b.mataPelajaranDiampu || '',
        isKepalaSekolah: Boolean(b.isKepalaSekolah),
        isWaliKelas: Boolean(b.isWaliKelas),
        waliKelasUntuk: b.waliKelasUntuk || '',
        isGuruKelas: Boolean(b.isGuruKelas),
        ttdDigital: b.ttdDigital || '',
      })
      .returning();

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Tambah PTK',
      module: 'Data PTK',
      details: `Menambahkan PTK ${inserted[0].namaLengkap}.`,
    });

    return res.json({ ptk: inserted[0] });
  } catch (error) {
    console.error('Create PTK error:', error);
    return res.status(500).json({ error: 'Gagal menambahkan data PTK.' });
  }
});

app.put('/api/ptk/:id', requireAuth, requireRole('Administrator', 'Kepala Sekolah'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const b = req.body;
    const updated = await db
      .update(ptk)
      .set({
        namaLengkap: b.namaLengkap?.trim(),
        nip: b.nip ?? '',
        nuptk: b.nuptk ?? '',
        pangkatGolongan: b.pangkatGolongan ?? '',
        jabatan: b.jabatan ?? '',
        statusKepegawaian: b.statusKepegawaian ?? 'PNS',
        mataPelajaranDiampu: b.mataPelajaranDiampu ?? '',
        isKepalaSekolah: Boolean(b.isKepalaSekolah),
        isWaliKelas: Boolean(b.isWaliKelas),
        waliKelasUntuk: b.waliKelasUntuk ?? '',
        isGuruKelas: Boolean(b.isGuruKelas),
        ttdDigital: b.ttdDigital ?? '',
      })
      .where(eq(ptk.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Data PTK tidak ditemukan.' });
    }

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Edit PTK',
      module: 'Data PTK',
      details: `Memperbarui data PTK ${updated[0].namaLengkap}.`,
    });

    return res.json({ ptk: updated[0] });
  } catch (error) {
    console.error('Update PTK error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui data PTK.' });
  }
});

app.delete('/api/ptk/:id', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(ptk).where(eq(ptk.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Data PTK tidak ditemukan.' });
    }

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Hapus PTK',
      module: 'Data PTK',
      details: `Menghapus PTK ${deleted[0].namaLengkap}.`,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete PTK error:', error);
    return res.status(500).json({ error: 'Gagal menghapus data PTK.' });
  }
});

// ============================================================================
// DATA SISWA
// ============================================================================
app.get('/api/students', requireAuth, async (req, res) => {
  try {
    const tahunPelajaran = req.query.tahunPelajaran ? String(req.query.tahunPelajaran) : undefined;
    const rows = await getStudentsByYear(tahunPelajaran);
    return res.json({ students: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post(
  '/api/students',
  requireAuth,
  requireRole('Administrator', 'Wali Kelas'),
  async (req: AuthRequest, res) => {
    try {
      const b = req.body;
      if (!b.nis?.trim() || !b.namaLengkap?.trim() || !b.kelas?.trim()) {
        return res.status(400).json({ error: 'NIS, Nama Lengkap, dan Kelas wajib diisi.' });
      }
      const inserted = await db
        .insert(students)
        .values({
          nis: b.nis.trim(),
          nisn: (b.nisn || '').trim(),
          namaLengkap: b.namaLengkap.trim(),
          jenisKelamin: b.jenisKelamin || 'L',
          tempatTanggalLahir: b.tempatTanggalLahir || '',
          kelas: b.kelas.trim(),
          tahunPelajaran: b.tahunPelajaran || '2026/2027',
          namaWaliKelas: b.namaWaliKelas || '',
          alamat: b.alamat || '',
          statusSiswa: b.statusSiswa || 'Aktif',
        })
        .returning();

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Tambah Siswa',
        module: 'Data Siswa',
        details: `Menambahkan siswa ${inserted[0].namaLengkap} (Kelas ${inserted[0].kelas}).`,
      });

      return res.json({ student: inserted[0] });
    } catch (error) {
      console.error('Create student error:', error);
      return res.status(400).json({ error: 'Gagal menambahkan siswa. Pastikan NIS belum terdaftar pada tahun ini.' });
    }
  }
);

app.post(
  '/api/students/bulk',
  requireAuth,
  requireRole('Administrator', 'Wali Kelas'),
  async (req: AuthRequest, res) => {
    try {
      const { rows, tahunPelajaran } = req.body as { rows: any[]; tahunPelajaran: string };
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Data siswa dari Excel kosong.' });
      }

      const values = rows
        .filter((r) => r.nis && r.namaLengkap && r.kelas)
        .map((r) => ({
          nis: String(r.nis).trim(),
          nisn: String(r.nisn || '').trim(),
          namaLengkap: String(r.namaLengkap).trim(),
          jenisKelamin: String(r.jenisKelamin || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
          tempatTanggalLahir: String(r.tempatTanggalLahir || '').trim(),
          kelas: String(r.kelas).trim(),
          tahunPelajaran: String(r.tahunPelajaran || tahunPelajaran || '2026/2027').trim(),
          namaWaliKelas: String(r.namaWaliKelas || '').trim(),
          alamat: String(r.alamat || '').trim(),
          statusSiswa: String(r.statusSiswa || 'Aktif').trim(),
        }));

      if (values.length === 0) {
        return res.status(400).json({ error: 'Tidak ada baris siswa yang valid.' });
      }

      const inserted = await db
        .insert(students)
        .values(values)
        .onConflictDoNothing()
        .returning();

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Import Excel Siswa',
        module: 'Data Siswa',
        details: `Mengimpor ${inserted.length} siswa baru dari file Excel.`,
      });

      return res.json({ importedCount: inserted.length, students: inserted });
    } catch (error) {
      console.error('Bulk import students error:', error);
      return res.status(500).json({ error: 'Gagal mengimpor data siswa.' });
    }
  }
);

app.put(
  '/api/students/:id',
  requireAuth,
  requireRole('Administrator', 'Wali Kelas'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body;
      const updated = await db
        .update(students)
        .set({
          nis: b.nis?.trim(),
          nisn: b.nisn?.trim() ?? '',
          namaLengkap: b.namaLengkap?.trim(),
          jenisKelamin: b.jenisKelamin || 'L',
          tempatTanggalLahir: b.tempatTanggalLahir ?? '',
          kelas: b.kelas?.trim(),
          tahunPelajaran: b.tahunPelajaran || '2026/2027',
          namaWaliKelas: b.namaWaliKelas ?? '',
          alamat: b.alamat ?? '',
          statusSiswa: b.statusSiswa || 'Aktif',
        })
        .where(eq(students.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
      }

      return res.json({ student: updated[0] });
    } catch (error) {
      console.error('Update student error:', error);
      return res.status(500).json({ error: 'Gagal memperbarui data siswa.' });
    }
  }
);

app.delete(
  '/api/students/:id',
  requireAuth,
  requireRole('Administrator'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await db.delete(students).where(eq(students.id, id)).returning();
      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Siswa tidak ditemukan.' });
      }

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Hapus Siswa',
        module: 'Data Siswa',
        details: `Menghapus data siswa ${deleted[0].namaLengkap}.`,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('Delete student error:', error);
      return res.status(500).json({ error: 'Gagal menghapus siswa.' });
    }
  }
);

// ============================================================================
// DATA MATA PELAJARAN
// ============================================================================
app.get('/api/subjects', requireAuth, async (req, res) => {
  try {
    const tahunPelajaran = req.query.tahunPelajaran ? String(req.query.tahunPelajaran) : undefined;
    const rows = await getSubjectsByYear(tahunPelajaran);
    return res.json({ subjects: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post(
  '/api/subjects',
  requireAuth,
  requireRole('Administrator', 'Guru'),
  async (req: AuthRequest, res) => {
    try {
      const b = req.body;
      if (!b.kodeMapel?.trim() || !b.namaMapel?.trim() || !b.kelas?.trim() || !b.jenisUjian?.trim()) {
        return res.status(400).json({ error: 'Kode, Nama Mata Pelajaran, Kelas, dan Jenis Ujian wajib diisi.' });
      }
      const kkmVal = Number(b.kkm ?? 70);
      const jumlahSoalVal = Number(b.jumlahSoal ?? 40);
      const inserted = await db
        .insert(subjects)
        .values({
          kodeMapel: b.kodeMapel.trim(),
          namaMapel: b.namaMapel.trim(),
          kelas: b.kelas.trim(),
          namaGuruPengampu: (b.namaGuruPengampu || '').trim(),
          kkm: Number.isFinite(kkmVal) ? kkmVal : 70,
          jumlahSoal: Number.isFinite(jumlahSoalVal) ? jumlahSoalVal : 40,
          jenisUjian: b.jenisUjian.trim(),
          tahunPelajaran: b.tahunPelajaran || '2026/2027',
        })
        .returning();

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Tambah Mata Pelajaran',
        module: 'Mata Pelajaran',
        details: `Menambahkan mapel ${inserted[0].namaMapel} Kelas ${inserted[0].kelas} (${inserted[0].jenisUjian}).`,
      });

      return res.json({ subject: inserted[0] });
    } catch (error) {
      console.error('Create subject error:', error);
      return res.status(500).json({ error: 'Gagal menambahkan mata pelajaran.' });
    }
  }
);

app.put(
  '/api/subjects/:id',
  requireAuth,
  requireRole('Administrator', 'Guru'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const b = req.body;
      const updated = await db
        .update(subjects)
        .set({
          kodeMapel: b.kodeMapel?.trim(),
          namaMapel: b.namaMapel?.trim(),
          kelas: b.kelas?.trim(),
          namaGuruPengampu: b.namaGuruPengampu ?? '',
          kkm: Number(b.kkm ?? 70),
          jumlahSoal: Number(b.jumlahSoal ?? 40),
          jenisUjian: b.jenisUjian?.trim(),
          tahunPelajaran: b.tahunPelajaran || '2026/2027',
        })
        .where(eq(subjects.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
      }
      return res.json({ subject: updated[0] });
    } catch (error) {
      console.error('Update subject error:', error);
      return res.status(500).json({ error: 'Gagal memperbarui mata pelajaran.' });
    }
  }
);

app.delete(
  '/api/subjects/:id',
  requireAuth,
  requireRole('Administrator'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await db.delete(subjects).where(eq(subjects.id, id)).returning();
      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete subject error:', error);
      return res.status(500).json({ error: 'Gagal menghapus mata pelajaran.' });
    }
  }
);

// ============================================================================
// INPUT SOAL & KUNCI JAWABAN
// ============================================================================
app.get('/api/exam-papers', requireAuth, async (req, res) => {
  try {
    const tahunPelajaran = req.query.tahunPelajaran ? String(req.query.tahunPelajaran) : undefined;
    const papers = await getExamPapersWithQuestions(tahunPelajaran);
    return res.json({ examPapers: papers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post(
  '/api/questions/save',
  requireAuth,
  requireRole('Administrator', 'Guru'),
  async (req: AuthRequest, res) => {
    try {
      const {
        jenisUjian,
        tahunPelajaran,
        kelas,
        subjectId,
        namaMataPelajaran,
        guruPengampu,
        jumlahSoal,
        tipePenilaian,
        questionsList,
      } = req.body as {
        jenisUjian: string;
        tahunPelajaran: string;
        kelas: string;
        subjectId: number;
        namaMataPelajaran: string;
        guruPengampu: string;
        jumlahSoal: number;
        tipePenilaian: string;
        questionsList: Array<{
          nomorSoal: number;
          tipeSoal?: string;
          pertanyaan?: string;
          opsiA?: string;
          opsiB?: string;
          opsiC?: string;
          opsiD?: string;
          kunciJawaban: string;
          bobot?: number;
        }>;
      };

      if (!jenisUjian || !tahunPelajaran || !kelas || !subjectId || !jumlahSoal) {
        return res.status(400).json({ error: 'Parameter paket soal belum lengkap.' });
      }

      if (tipePenilaian === 'Pilihan Ganda A-D') {
        const missing = questionsList.filter(
          (q) => !['A', 'B', 'C', 'D'].includes((q.kunciJawaban || '').toUpperCase())
        );
        if (questionsList.length !== jumlahSoal || missing.length > 0) {
          return res.status(400).json({
            error: 'Seluruh nomor soal pilihan ganda wajib memiliki kunci jawaban A, B, C, atau D.',
          });
        }
      }

      const existingPaper = await db
        .select()
        .from(examPapers)
        .where(
          and(
            eq(examPapers.jenisUjian, jenisUjian),
            eq(examPapers.tahunPelajaran, tahunPelajaran),
            eq(examPapers.kelas, kelas),
            eq(examPapers.subjectId, subjectId)
          )
        )
        .limit(1);

      let paperId: number;
      if (existingPaper.length > 0) {
        const updated = await db
          .update(examPapers)
          .set({
            namaMataPelajaran,
            guruPengampu,
            jumlahSoal,
            tipePenilaian,
            updatedAt: new Date(),
          })
          .where(eq(examPapers.id, existingPaper[0].id))
          .returning();
        paperId = updated[0].id;
        await db.delete(questions).where(eq(questions.examPaperId, paperId));
      } else {
        const inserted = await db
          .insert(examPapers)
          .values({
            jenisUjian,
            tahunPelajaran,
            kelas,
            subjectId,
            namaMataPelajaran,
            guruPengampu,
            jumlahSoal,
            tipePenilaian,
          })
          .returning();
        paperId = inserted[0].id;
      }

      if (questionsList.length > 0) {
        await db.insert(questions).values(
          questionsList.map((q) => ({
            examPaperId: paperId,
            nomorSoal: q.nomorSoal,
            tipeSoal: q.tipeSoal || tipePenilaian,
            pertanyaan: q.pertanyaan || `Soal Nomor ${q.nomorSoal}`,
            opsiA: q.opsiA || '',
            opsiB: q.opsiB || '',
            opsiC: q.opsiC || '',
            opsiD: q.opsiD || '',
            kunciJawaban: (q.kunciJawaban || '').trim().toUpperCase(),
            bobot: q.bobot ?? 1,
          }))
        );
      }

      await db
        .update(subjects)
        .set({ jumlahSoal })
        .where(eq(subjects.id, subjectId));

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Simpan Kunci Jawaban',
        module: 'Input Soal',
        details: `Menyimpan ${questionsList.length} soal & kunci jawaban ${namaMataPelajaran} Kelas ${kelas} (${jenisUjian}).`,
      });

      const fullPapers = await getExamPapersWithQuestions(tahunPelajaran);
      const savedPaper = fullPapers.find((p) => p.id === paperId);
      return res.json({ examPaper: savedPaper });
    } catch (error) {
      console.error('Save questions error:', error);
      return res.status(500).json({ error: 'Gagal menyimpan soal dan kunci jawaban.' });
    }
  }
);

app.post(
  '/api/exam-papers/duplicate',
  requireAuth,
  requireRole('Administrator', 'Guru'),
  async (req: AuthRequest, res) => {
    try {
      const { sourcePaperId, targetJenisUjian, targetTahunPelajaran } = req.body as {
        sourcePaperId: number;
        targetJenisUjian: string;
        targetTahunPelajaran: string;
      };

      const source = await db.select().from(examPapers).where(eq(examPapers.id, sourcePaperId)).limit(1);
      if (source.length === 0) {
        return res.status(404).json({ error: 'Paket soal sumber tidak ditemukan.' });
      }
      const src = source[0];
      const srcQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examPaperId, src.id))
        .orderBy(asc(questions.nomorSoal));

      // Find or create matching subject in target exam type & year
      let targetSubject = await db
        .select()
        .from(subjects)
        .where(
          and(
            eq(subjects.namaMapel, src.namaMataPelajaran),
            eq(subjects.kelas, src.kelas),
            eq(subjects.jenisUjian, targetJenisUjian),
            eq(subjects.tahunPelajaran, targetTahunPelajaran)
          )
        )
        .limit(1);

      let targetSubjectId: number;
      if (targetSubject.length > 0) {
        targetSubjectId = targetSubject[0].id;
      } else {
        const origSubj = await db.select().from(subjects).where(eq(subjects.id, src.subjectId)).limit(1);
        const createdSubj = await db
          .insert(subjects)
          .values({
            kodeMapel: `${origSubj[0]?.kodeMapel || 'MAPEL'}-${targetJenisUjian === 'PAS Genap' ? 'GNP' : targetJenisUjian === 'Ujian Sekolah' ? 'US' : 'GNJ'}`,
            namaMapel: src.namaMataPelajaran,
            kelas: src.kelas,
            namaGuruPengampu: src.guruPengampu,
            kkm: origSubj[0]?.kkm ?? 70,
            jumlahSoal: src.jumlahSoal,
            jenisUjian: targetJenisUjian,
            tahunPelajaran: targetTahunPelajaran,
          })
          .returning();
        targetSubjectId = createdSubj[0].id;
      }

      const existingTarget = await db
        .select()
        .from(examPapers)
        .where(
          and(
            eq(examPapers.jenisUjian, targetJenisUjian),
            eq(examPapers.tahunPelajaran, targetTahunPelajaran),
            eq(examPapers.kelas, src.kelas),
            eq(examPapers.subjectId, targetSubjectId)
          )
        )
        .limit(1);

      let newPaperId: number;
      if (existingTarget.length > 0) {
        newPaperId = existingTarget[0].id;
        await db.delete(questions).where(eq(questions.examPaperId, newPaperId));
      } else {
        const insertedPaper = await db
          .insert(examPapers)
          .values({
            jenisUjian: targetJenisUjian,
            tahunPelajaran: targetTahunPelajaran,
            kelas: src.kelas,
            subjectId: targetSubjectId,
            namaMataPelajaran: src.namaMataPelajaran,
            guruPengampu: src.guruPengampu,
            jumlahSoal: src.jumlahSoal,
            tipePenilaian: src.tipePenilaian,
          })
          .returning();
        newPaperId = insertedPaper[0].id;
      }

      if (srcQuestions.length > 0) {
        await db.insert(questions).values(
          srcQuestions.map((q) => ({
            examPaperId: newPaperId,
            nomorSoal: q.nomorSoal,
            tipeSoal: q.tipeSoal,
            pertanyaan: q.pertanyaan,
            opsiA: q.opsiA,
            opsiB: q.opsiB,
            opsiC: q.opsiC,
            opsiD: q.opsiD,
            kunciJawaban: q.kunciJawaban,
            bobot: q.bobot,
          }))
        );
      }

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Duplikasi Soal',
        module: 'Input Soal',
        details: `Menduplikasi paket soal ${src.namaMataPelajaran} Kelas ${src.kelas} ke ${targetJenisUjian} (${targetTahunPelajaran}).`,
      });

      return res.json({ success: true, newPaperId });
    } catch (error) {
      console.error('Duplicate exam paper error:', error);
      return res.status(500).json({ error: 'Gagal menduplikasi paket soal.' });
    }
  }
);

app.delete(
  '/api/exam-papers/:id',
  requireAuth,
  requireRole('Administrator', 'Guru'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await db.delete(examPapers).where(eq(examPapers.id, id)).returning();
      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Paket soal tidak ditemukan.' });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete exam paper error:', error);
      return res.status(500).json({ error: 'Gagal menghapus paket soal.' });
    }
  }
);

// ============================================================================
// KOREKSI SOAL OTOMATIS & DAFTAR NILAI
// ============================================================================
app.get('/api/grading', requireAuth, async (req, res) => {
  try {
    const tahunPelajaran = req.query.tahunPelajaran ? String(req.query.tahunPelajaran) : undefined;
    const rows = tahunPelajaran
      ? await db
          .select()
          .from(gradingResults)
          .where(eq(gradingResults.tahunPelajaran, tahunPelajaran))
          .orderBy(desc(gradingResults.updatedAt))
      : await db.select().from(gradingResults).orderBy(desc(gradingResults.updatedAt));

    return res.json({ gradingResults: rows });
  } catch (error) {
    console.error('Fetch grading results error:', error);
    return res.status(500).json({ error: 'Gagal memuat hasil koreksi nilai.' });
  }
});

app.post(
  '/api/grading/auto-grade',
  requireAuth,
  requireRole('Administrator', 'Guru', 'Wali Kelas'),
  async (req: AuthRequest, res) => {
    try {
      const {
        jenisUjian,
        tahunPelajaran,
        kelas,
        studentId,
        subjectId,
        jawabanSiswa,
        note,
      } = req.body as {
        jenisUjian: string;
        tahunPelajaran: string;
        kelas: string;
        studentId: number;
        subjectId: number;
        jawabanSiswa: Record<string, string>;
        note?: string;
      };

      const subjRows = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
      if (subjRows.length === 0) {
        return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
      }
      const subj = subjRows[0];

      const paperRows = await db
        .select()
        .from(examPapers)
        .where(
          and(
            eq(examPapers.jenisUjian, jenisUjian),
            eq(examPapers.tahunPelajaran, tahunPelajaran),
            eq(examPapers.kelas, kelas),
            eq(examPapers.subjectId, subjectId)
          )
        )
        .limit(1);

      if (paperRows.length === 0) {
        return res.status(400).json({
          error: 'Kunci jawaban untuk mata pelajaran, kelas, dan jenis ujian ini belum diinput.',
        });
      }
      const paper = paperRows[0];
      const qRows = await db
        .select()
        .from(questions)
        .where(eq(questions.examPaperId, paper.id))
        .orderBy(asc(questions.nomorSoal));

      if (qRows.length === 0) {
        return res.status(400).json({ error: 'Soal dan kunci jawaban masih kosong.' });
      }

      const keyMap: Record<string, string> = {};
      for (const q of qRows) {
        keyMap[String(q.nomorSoal)] = q.kunciJawaban;
      }

      const summary = computeAutoGrade(keyMap, jawabanSiswa || {}, qRows.length, subj.kkm);

      const { record, isUpdate } = await upsertGradingResult({
        examPaperId: paper.id,
        studentId,
        subjectId,
        jenisUjian,
        tahunPelajaran,
        kelas,
        jawabanSiswa: jawabanSiswa || {},
        ...summary,
        gradedBy: req.appUser!.fullName,
        note,
      });

      const stu = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: isUpdate ? 'Koreksi Ulang Nilai' : 'Koreksi Otomatis',
        module: 'Koreksi Soal',
        details: `${isUpdate ? 'Memperbarui' : 'Menyimpan'} nilai ${subj.namaMapel} (${jenisUjian}) untuk ${stu[0]?.namaLengkap || 'Siswa'}: ${summary.nilaiAkhir} (${summary.statusKetuntasan}).`,
      });

      return res.json({ result: record, isUpdate });
    } catch (error) {
      console.error('Auto-grade error:', error);
      return res.status(500).json({ error: 'Gagal memproses koreksi otomatis.' });
    }
  }
);

app.post(
  '/api/grading/batch-grade',
  requireAuth,
  requireRole('Administrator', 'Guru', 'Wali Kelas'),
  async (req: AuthRequest, res) => {
    try {
      const { jenisUjian, tahunPelajaran, kelas, subjectId, entries } = req.body as {
        jenisUjian: string;
        tahunPelajaran: string;
        kelas: string;
        subjectId: number;
        entries: Array<{ studentId: number; jawabanSiswa: Record<string, string> }>;
      };

      const subjRows = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
      if (subjRows.length === 0) {
        return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
      }
      const subj = subjRows[0];

      const paperRows = await db
        .select()
        .from(examPapers)
        .where(
          and(
            eq(examPapers.jenisUjian, jenisUjian),
            eq(examPapers.tahunPelajaran, tahunPelajaran),
            eq(examPapers.kelas, kelas),
            eq(examPapers.subjectId, subjectId)
          )
        )
        .limit(1);

      if (paperRows.length === 0) {
        return res.status(400).json({ error: 'Kunci jawaban belum tersedia untuk paket ujian ini.' });
      }
      const paper = paperRows[0];
      const qRows = await db
        .select()
        .from(questions)
        .where(eq(questions.examPaperId, paper.id))
        .orderBy(asc(questions.nomorSoal));

      const keyMap: Record<string, string> = {};
      for (const q of qRows) {
        keyMap[String(q.nomorSoal)] = q.kunciJawaban;
      }

      const savedRecords = [];
      for (const entry of entries) {
        const summary = computeAutoGrade(keyMap, entry.jawabanSiswa || {}, qRows.length, subj.kkm);
        const { record } = await upsertGradingResult({
          examPaperId: paper.id,
          studentId: entry.studentId,
          subjectId,
          jenisUjian,
          tahunPelajaran,
          kelas,
          jawabanSiswa: entry.jawabanSiswa || {},
          ...summary,
          gradedBy: req.appUser!.fullName,
          note: 'Koreksi massal satu kelas',
        });
        savedRecords.push(record);
      }

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Koreksi Satu Kelas',
        module: 'Koreksi Soal',
        details: `Menyimpan hasil koreksi massal ${subj.namaMapel} Kelas ${kelas} (${jenisUjian}) untuk ${savedRecords.length} siswa.`,
      });

      return res.json({ results: savedRecords });
    } catch (error) {
      console.error('Batch grade error:', error);
      return res.status(500).json({ error: 'Gagal menyimpan koreksi massal kelas.' });
    }
  }
);

app.delete(
  '/api/grading/:id',
  requireAuth,
  requireRole('Administrator', 'Guru'),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = await db.delete(gradingResults).where(eq(gradingResults.id, id)).returning();
      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Data nilai tidak ditemukan.' });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error('Delete grading error:', error);
      return res.status(500).json({ error: 'Gagal menghapus data nilai.' });
    }
  }
);

// ============================================================================
// ABSENSI PESERTA UJIAN
// ============================================================================
app.get('/api/attendance', requireAuth, async (req, res) => {
  try {
    const tahunPelajaran = req.query.tahunPelajaran ? String(req.query.tahunPelajaran) : undefined;
    const rows = tahunPelajaran
      ? await db
          .select()
          .from(examAttendances)
          .where(eq(examAttendances.tahunPelajaran, tahunPelajaran))
          .orderBy(desc(examAttendances.tanggalUjian))
      : await db.select().from(examAttendances).orderBy(desc(examAttendances.tanggalUjian));

    return res.json({ attendances: rows });
  } catch (error) {
    console.error('Get attendance error:', error);
    return res.status(500).json({ error: 'Gagal memuat data absensi ujian.' });
  }
});

app.post(
  '/api/attendance/save',
  requireAuth,
  requireRole('Administrator', 'Guru', 'Wali Kelas'),
  async (req: AuthRequest, res) => {
    try {
      const { jenisUjian, tahunPelajaran, kelas, tanggalUjian, subjectId, items } = req.body as {
        jenisUjian: string;
        tahunPelajaran: string;
        kelas: string;
        tanggalUjian: string;
        subjectId: number;
        items: Array<{ studentId: number; statusKehadiran: string }>;
      };

      if (!jenisUjian || !tahunPelajaran || !kelas || !tanggalUjian || !subjectId || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Data absensi tidak lengkap.' });
      }

      const saved = [];
      for (const item of items) {
        const resRow = await db
          .insert(examAttendances)
          .values({
            studentId: item.studentId,
            subjectId,
            jenisUjian,
            tahunPelajaran,
            kelas,
            tanggalUjian,
            statusKehadiran: item.statusKehadiran || 'Hadir',
            recordedBy: req.appUser!.fullName,
          })
          .onConflictDoUpdate({
            target: [
              examAttendances.studentId,
              examAttendances.subjectId,
              examAttendances.jenisUjian,
              examAttendances.tahunPelajaran,
              examAttendances.tanggalUjian,
            ],
            set: {
              statusKehadiran: item.statusKehadiran || 'Hadir',
              recordedBy: req.appUser!.fullName,
              updatedAt: new Date(),
            },
          })
          .returning();
        saved.push(resRow[0]);
      }

      await logActivity({
        userId: req.appUser!.id,
        userName: req.appUser!.fullName,
        userRole: req.appUser!.role,
        action: 'Simpan Absensi',
        module: 'Absensi Ujian',
        details: `Menyimpan absensi ujian Kelas ${kelas} (${jenisUjian}, ${tanggalUjian}) untuk ${saved.length} siswa.`,
      });

      return res.json({ attendances: saved });
    } catch (error) {
      console.error('Save attendance error:', error);
      return res.status(500).json({ error: 'Gagal menyimpan absensi peserta ujian.' });
    }
  }
);

// ============================================================================
// PENGGUNA, AKTIVITAS, BACKUP & RESTORE
// ============================================================================
app.get('/api/users', requireAuth, requireRole('Administrator'), async (_req, res) => {
  try {
    const rows = await getAllUsersSafe();
    return res.json({ users: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const b = req.body as {
      username?: string;
      email: string;
      password?: string;
      fullName: string;
      role: UserRole;
      ptkId?: number | null;
      assignedClass?: string;
      assignedSubjects?: string[];
    };

    if (!b.email || !b.fullName || !b.role) {
      return res.status(400).json({ error: 'Email, nama lengkap, dan peran wajib diisi.' });
    }
    if (!b.password || b.password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter.' });
    }

    const uname = b.username?.trim() || b.email.split('@')[0];
    const uid = `local_${uname}_${Date.now()}`;

    const inserted = await db
      .insert(users)
      .values({
        uid,
        username: uname,
        email: b.email.trim(),
        passwordHash: hashPassword(b.password),
        fullName: b.fullName.trim(),
        role: b.role,
        ptkId: b.ptkId ?? null,
        assignedClass: b.assignedClass || '',
        assignedSubjects: b.assignedSubjects || [],
        isActive: true,
      })
      .returning({
        id: users.id,
        uid: users.uid,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        ptkId: users.ptkId,
        assignedClass: users.assignedClass,
        assignedSubjects: users.assignedSubjects,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Tambah Pengguna',
      module: 'Pengaturan',
      details: `Membuat akun ${inserted[0].username} (${inserted[0].role}).`,
    });

    return res.json({ user: inserted[0] });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(400).json({ error: 'Username sudah terdaftar atau data tidak valid.' });
  }
});

app.put('/api/users/:id', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const b = req.body;
    const updatePayload: Record<string, any> = {
      fullName: b.fullName,
      email: b.email,
      role: b.role,
      ptkId: b.ptkId ?? null,
      assignedClass: b.assignedClass ?? '',
      assignedSubjects: b.assignedSubjects ?? [],
      isActive: typeof b.isActive === 'boolean' ? b.isActive : true,
    };
    if (b.password && String(b.password).length >= 6) {
      updatePayload.passwordHash = hashPassword(String(b.password));
    }

    const updated = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        uid: users.uid,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        ptkId: users.ptkId,
        assignedClass: users.assignedClass,
        assignedSubjects: users.assignedSubjects,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    return res.json({ user: updated[0] });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Gagal memperbarui pengguna.' });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.appUser!.id) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri yang sedang login.' });
    }
    const deleted = await db.delete(users).where(eq(users.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Gagal menghapus pengguna.' });
  }
});

app.get('/api/activity-logs', requireAuth, async (_req, res) => {
  try {
    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);
    return res.json({ logs });
  } catch (error) {
    console.error('Get activity logs error:', error);
    return res.status(500).json({ error: 'Gagal memuat riwayat aktivitas.' });
  }
});

app.get('/api/backup', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const [
      schoolRows,
      yearRows,
      ptkRows,
      studentRows,
      subjectRows,
      paperRows,
      questionRows,
      gradingRows,
      attendanceRows,
    ] = await Promise.all([
      db.select().from(schools),
      db.select().from(academicYears),
      db.select().from(ptk),
      db.select().from(students),
      db.select().from(subjects),
      db.select().from(examPapers),
      db.select().from(questions),
      db.select().from(gradingResults),
      db.select().from(examAttendances),
    ]);

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Backup Database',
      module: 'Pengaturan',
      details: 'Mengunduh file cadangan lengkap database PostgreSQL.',
    });

    return res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      data: {
        schools: schoolRows,
        academicYears: yearRows,
        ptk: ptkRows,
        students: studentRows,
        subjects: subjectRows,
        examPapers: paperRows,
        questions: questionRows,
        gradingResults: gradingRows,
        examAttendances: attendanceRows,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return res.status(500).json({ error: 'Gagal mengekspor cadangan database.' });
  }
});

app.post('/api/backup/restore', requireAuth, requireRole('Administrator'), async (req: AuthRequest, res) => {
  try {
    const payload = req.body?.data;
    if (!payload || !Array.isArray(payload.schools)) {
      return res.status(400).json({ error: 'Format file backup tidak valid.' });
    }

    // Restore schools and academic years non-destructively / safely
    if (Array.isArray(payload.academicYears)) {
      for (const y of payload.academicYears) {
        await db
          .insert(academicYears)
          .values({
            tahunPelajaran: y.tahunPelajaran,
            isActive: Boolean(y.isActive),
            isArchived: Boolean(y.isArchived),
          })
          .onConflictDoNothing();
      }
    }

    if (payload.schools.length > 0) {
      const s = payload.schools[0];
      const existing = await getActiveSchool();
      if (existing) {
        await db
          .update(schools)
          .set({
            namaSekolah: s.namaSekolah,
            npsn: s.npsn,
            statusSekolah: s.statusSekolah,
            alamatSekolah: s.alamatSekolah,
            desaKampung: s.desaKampung,
            distrik: s.distrik,
            kabupaten: s.kabupaten,
            provinsi: s.provinsi,
            kodePos: s.kodePos,
            tahunPelajaran: s.tahunPelajaran,
            logoSekolah: s.logoSekolah || '',
            namaKepalaSekolah: s.namaKepalaSekolah,
            nipKepalaSekolah: s.nipKepalaSekolah,
            ttdKepalaSekolah: s.ttdKepalaSekolah || '',
            tempatTanggal: s.tempatTanggal,
            updatedAt: new Date(),
          })
          .where(eq(schools.id, existing.id));
      }
    }

    await logActivity({
      userId: req.appUser!.id,
      userName: req.appUser!.fullName,
      userRole: req.appUser!.role,
      action: 'Restore Backup',
      module: 'Pengaturan',
      details: 'Memulihkan konfigurasi sekolah dan tahun pelajaran dari file backup.',
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Restore backup error:', error);
    return res.status(500).json({ error: 'Gagal memulihkan file backup.' });
  }
});

// ============================================================================
// SERVER STARTUP (VITE DEV MIDDLEWARE OR PRODUCTION STATIC)
// ============================================================================
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
