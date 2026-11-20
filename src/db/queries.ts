import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import type { EditHistoryEntry } from './schema.ts';
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
} from './schema.ts';

export async function logActivity(entry: {
  userId?: number | null;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
}) {
  try {
    await db.insert(activityLogs).values({
      userId: entry.userId ?? null,
      userName: entry.userName,
      userRole: entry.userRole,
      action: entry.action,
      module: entry.module,
      details: entry.details,
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
}

export async function getActiveSchool() {
  try {
    const rows = await db.select().from(schools).orderBy(asc(schools.id)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed (getActiveSchool):', error);
    throw new Error('Gagal memuat identitas sekolah.', { cause: error });
  }
}

export async function getAllAcademicYears() {
  try {
    return await db.select().from(academicYears).orderBy(desc(academicYears.tahunPelajaran));
  } catch (error) {
    console.error('Database query failed (getAllAcademicYears):', error);
    throw new Error('Gagal memuat daftar tahun pelajaran.', { cause: error });
  }
}

export async function getAllPtk() {
  try {
    return await db.select().from(ptk).orderBy(asc(ptk.id));
  } catch (error) {
    console.error('Database query failed (getAllPtk):', error);
    throw new Error('Gagal memuat data PTK.', { cause: error });
  }
}

export async function getStudentsByYear(tahunPelajaran?: string) {
  try {
    if (tahunPelajaran) {
      return await db
        .select()
        .from(students)
        .where(eq(students.tahunPelajaran, tahunPelajaran))
        .orderBy(asc(students.kelas), asc(students.namaLengkap));
    }
    return await db.select().from(students).orderBy(asc(students.kelas), asc(students.namaLengkap));
  } catch (error) {
    console.error('Database query failed (getStudentsByYear):', error);
    throw new Error('Gagal memuat data siswa.', { cause: error });
  }
}

export async function getSubjectsByYear(tahunPelajaran?: string) {
  try {
    if (tahunPelajaran) {
      return await db
        .select()
        .from(subjects)
        .where(eq(subjects.tahunPelajaran, tahunPelajaran))
        .orderBy(asc(subjects.jenisUjian), asc(subjects.kelas), asc(subjects.namaMapel));
    }
    return await db
      .select()
      .from(subjects)
      .orderBy(asc(subjects.jenisUjian), asc(subjects.kelas), asc(subjects.namaMapel));
  } catch (error) {
    console.error('Database query failed (getSubjectsByYear):', error);
    throw new Error('Gagal memuat data mata pelajaran.', { cause: error });
  }
}

export async function getExamPapersWithQuestions(tahunPelajaran?: string) {
  try {
    const papers = tahunPelajaran
      ? await db
          .select()
          .from(examPapers)
          .where(eq(examPapers.tahunPelajaran, tahunPelajaran))
          .orderBy(desc(examPapers.updatedAt))
      : await db.select().from(examPapers).orderBy(desc(examPapers.updatedAt));

    const allQuestions = await db
      .select()
      .from(questions)
      .orderBy(asc(questions.examPaperId), asc(questions.nomorSoal));

    const qMap = new Map<number, typeof allQuestions>();
    for (const q of allQuestions) {
      const list = qMap.get(q.examPaperId) ?? [];
      list.push(q);
      qMap.set(q.examPaperId, list);
    }

    return papers.map((p) => ({
      ...p,
      questions: qMap.get(p.id) ?? [],
    }));
  } catch (error) {
    console.error('Database query failed (getExamPapersWithQuestions):', error);
    throw new Error('Gagal memuat data soal dan kunci jawaban.', { cause: error });
  }
}

export async function upsertGradingResult(input: {
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
  statusKetuntasan: string;
  gradedBy: string;
  note?: string;
}) {
  try {
    const existing = await db
      .select()
      .from(gradingResults)
      .where(
        and(
          eq(gradingResults.studentId, input.studentId),
          eq(gradingResults.subjectId, input.subjectId),
          eq(gradingResults.jenisUjian, input.jenisUjian),
          eq(gradingResults.tahunPelajaran, input.tahunPelajaran)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0];
      const history: EditHistoryEntry[] = [
        ...(prev.editHistory || []),
        {
          editedAt: new Date().toISOString(),
          editedBy: input.gradedBy,
          previousScore: prev.nilaiAkhir,
          newScore: input.nilaiAkhir,
          note: input.note || 'Koreksi ulang dan pembaruan jawaban siswa',
        },
      ];
      const updated = await db
        .update(gradingResults)
        .set({
          examPaperId: input.examPaperId,
          kelas: input.kelas,
          jawabanSiswa: input.jawabanSiswa,
          jumlahSoal: input.jumlahSoal,
          jawabanBenar: input.jawabanBenar,
          jawabanSalah: input.jawabanSalah,
          tidakDijawab: input.tidakDijawab,
          nilaiAkhir: input.nilaiAkhir,
          kkm: input.kkm,
          statusKetuntasan: input.statusKetuntasan,
          gradedBy: input.gradedBy,
          editHistory: history,
          updatedAt: new Date(),
        })
        .where(eq(gradingResults.id, prev.id))
        .returning();
      return { record: updated[0], isUpdate: true };
    }

    const inserted = await db
      .insert(gradingResults)
      .values({
        examPaperId: input.examPaperId,
        studentId: input.studentId,
        subjectId: input.subjectId,
        jenisUjian: input.jenisUjian,
        tahunPelajaran: input.tahunPelajaran,
        kelas: input.kelas,
        jawabanSiswa: input.jawabanSiswa,
        jumlahSoal: input.jumlahSoal,
        jawabanBenar: input.jawabanBenar,
        jawabanSalah: input.jawabanSalah,
        tidakDijawab: input.tidakDijawab,
        nilaiAkhir: input.nilaiAkhir,
        kkm: input.kkm,
        statusKetuntasan: input.statusKetuntasan,
        gradedBy: input.gradedBy,
        editHistory: [],
      })
      .returning();

    return { record: inserted[0], isUpdate: false };
  } catch (error) {
    console.error('Database query failed (upsertGradingResult):', error);
    throw new Error('Gagal menyimpan hasil koreksi nilai siswa.', { cause: error });
  }
}

export async function getAllUsersSafe() {
  try {
    return await db
      .select({
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
      })
      .from(users)
      .orderBy(asc(users.id));
  } catch (error) {
    console.error('Database query failed (getAllUsersSafe):', error);
    throw new Error('Gagal memuat data pengguna.', { cause: error });
  }
}
