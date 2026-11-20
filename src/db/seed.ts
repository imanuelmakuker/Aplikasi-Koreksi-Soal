import { count } from 'drizzle-orm';
import { hashPassword } from '../lib/auth-utils.ts';
import { db } from './index.ts';
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

let seedPromise: Promise<void> | null = null;

export async function ensureInitialSeed(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const [{ value: schoolCount }] = await db.select({ value: count() }).from(schools);
      if (Number(schoolCount) > 0) {
        return;
      }

      // 1. Academic Years
      await db
        .insert(academicYears)
        .values([
          { tahunPelajaran: '2026/2027', isActive: true, isArchived: false },
          { tahunPelajaran: '2025/2026', isActive: false, isArchived: true },
        ])
        .onConflictDoNothing();

      // 2. School Identity
      await db.insert(schools).values({
        namaSekolah: 'SD NEGERI WARAWAF',
        npsn: '60401234',
        statusSekolah: 'Negeri',
        alamatSekolah: 'Jl. Pendidikan No. 12',
        desaKampung: 'Warawaf',
        distrik: 'Warawaf',
        kabupaten: 'Raja Ampat',
        provinsi: 'Papua Barat Daya',
        kodePos: '98482',
        tahunPelajaran: '2026/2027',
        logoSekolah: '',
        namaKepalaSekolah: 'Drs. Ahmad Santoso, M.Pd',
        nipKepalaSekolah: '19680514 199403 1 002',
        ttdKepalaSekolah: '',
        tempatTanggal: 'Warawaf, 18 Desember 2026',
      });

      // 3. PTK (Tenaga Pendidik & Kependidikan)
      const insertedPtk = await db
        .insert(ptk)
        .values([
          {
            namaLengkap: 'Drs. Ahmad Santoso, M.Pd',
            nip: '19680514 199403 1 002',
            nuptk: '4846746648200012',
            pangkatGolongan: 'Pembina Tk. I / IV-b',
            jabatan: 'Kepala Sekolah',
            statusKepegawaian: 'PNS',
            mataPelajaranDiampu: 'Manajemen Sekolah',
            isKepalaSekolah: true,
            isWaliKelas: false,
            waliKelasUntuk: '',
            isGuruKelas: false,
          },
          {
            namaLengkap: 'Siti Nurhayati, S.Pd',
            nip: '19800721 200801 2 010',
            nuptk: '6053758660300043',
            pangkatGolongan: 'Penata Tk. I / III-d',
            jabatan: 'Guru Kelas VI',
            statusKepegawaian: 'PNS',
            mataPelajaranDiampu: 'Matematika, Bahasa Indonesia, IPAS, PPKn',
            isKepalaSekolah: false,
            isWaliKelas: true,
            waliKelasUntuk: 'VI',
            isGuruKelas: true,
          },
          {
            namaLengkap: 'Drs. Budi Santoso',
            nip: '19790315 200902 1 005',
            nuptk: '3647757658200022',
            pangkatGolongan: 'Penata / III-c',
            jabatan: 'Guru Kelas V',
            statusKepegawaian: 'PNS',
            mataPelajaranDiampu: 'Matematika, Bahasa Indonesia, IPA, IPS',
            isKepalaSekolah: false,
            isWaliKelas: true,
            waliKelasUntuk: 'V',
            isGuruKelas: true,
          },
          {
            namaLengkap: 'Dra. Rini Wati',
            nip: '19821104 201001 2 014',
            nuptk: '7436760661300033',
            pangkatGolongan: 'Penata / III-c',
            jabatan: 'Guru Kelas IV',
            statusKepegawaian: 'PNS',
            mataPelajaranDiampu: 'IPA, IPS, Bahasa Indonesia',
            isKepalaSekolah: false,
            isWaliKelas: true,
            waliKelasUntuk: 'IV',
            isGuruKelas: true,
          },
          {
            namaLengkap: 'Agus Setiawan, S.Pd',
            nip: '19870618 201903 1 004',
            nuptk: '8950765666130112',
            pangkatGolongan: 'Ahli Pertama / IX',
            jabatan: 'Guru Kelas III',
            statusKepegawaian: 'PPPK',
            mataPelajaranDiampu: 'Tematik, Matematika',
            isKepalaSekolah: false,
            isWaliKelas: true,
            waliKelasUntuk: 'III',
            isGuruKelas: true,
          },
          {
            namaLengkap: 'Yuniarti, S.Pd',
            nip: '19900212 202012 2 008',
            nuptk: '5544768669230152',
            pangkatGolongan: 'Penata Muda / III-a',
            jabatan: 'Guru Kelas II',
            statusKepegawaian: 'PNS',
            mataPelajaranDiampu: 'PPKn, Bahasa Indonesia',
            isKepalaSekolah: false,
            isWaliKelas: true,
            waliKelasUntuk: 'II',
            isGuruKelas: true,
          },
          {
            namaLengkap: 'Mariana Dimara, S.Pd',
            nip: '19920825 202221 2 011',
            nuptk: '1157770671230093',
            pangkatGolongan: 'Ahli Pertama / IX',
            jabatan: 'Guru Kelas I',
            statusKepegawaian: 'PPPK',
            mataPelajaranDiampu: 'Tematik Kelas I',
            isKepalaSekolah: false,
            isWaliKelas: true,
            waliKelasUntuk: 'I',
            isGuruKelas: true,
          },
        ])
        .returning();

      // 4. Credential User Accounts for all 4 roles
      const kepsekPtk = insertedPtk.find((p) => p.isKepalaSekolah);
      const guruPtk = insertedPtk.find((p) => p.waliKelasUntuk === 'V');
      const waliPtk = insertedPtk.find((p) => p.waliKelasUntuk === 'VI');

      await db
        .insert(users)
        .values([
          {
            uid: 'local_admin',
            username: 'admin',
            email: 'admin@sdnwarawaf.sch.id',
            passwordHash: hashPassword('admin123'),
            fullName: 'Administrator Sekolah',
            role: 'Administrator',
            assignedClass: '',
            assignedSubjects: [],
            isActive: true,
          },
          {
            uid: 'local_kepsek',
            username: 'kepsek',
            email: 'kepsek@sdnwarawaf.sch.id',
            passwordHash: hashPassword('kepsek123'),
            fullName: 'Drs. Ahmad Santoso, M.Pd',
            role: 'Kepala Sekolah',
            ptkId: kepsekPtk?.id ?? null,
            assignedClass: '',
            assignedSubjects: [],
            isActive: true,
          },
          {
            uid: 'local_guru',
            username: 'guru',
            email: 'guru@sdnwarawaf.sch.id',
            passwordHash: hashPassword('guru123'),
            fullName: 'Drs. Budi Santoso',
            role: 'Guru',
            ptkId: guruPtk?.id ?? null,
            assignedClass: 'V',
            assignedSubjects: ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS'],
            isActive: true,
          },
          {
            uid: 'local_walikelas',
            username: 'walikelas',
            email: 'walikelas6@sdnwarawaf.sch.id',
            passwordHash: hashPassword('wali123'),
            fullName: 'Siti Nurhayati, S.Pd',
            role: 'Wali Kelas',
            ptkId: waliPtk?.id ?? null,
            assignedClass: 'VI',
            assignedSubjects: ['Matematika', 'Bahasa Indonesia', 'IPA', 'PPKn'],
            isActive: true,
          },
        ])
        .onConflictDoNothing();

      // 5. Students across Kelas I - VI
      const insertedStudents = await db
        .insert(students)
        .values([
          // Kelas VI (8 siswa)
          {
            nis: '1001',
            nisn: '0067890123',
            namaLengkap: 'Andi Pratama',
            jenisKelamin: 'L',
            tempatTanggalLahir: 'Sorong, 14 Mei 2014',
            kelas: 'VI',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Siti Nurhayati, S.Pd',
            alamat: 'Kampung Warawaf RT 01',
            statusSiswa: 'Aktif',
          },
          {
            nis: '1002',
            nisn: '0067890124',
            namaLengkap: 'Budi Santoso',
            jenisKelamin: 'L',
            tempatTanggalLahir: 'Waisai, 22 Agustus 2014',
            kelas: 'VI',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Siti Nurhayati, S.Pd',
            alamat: 'Kampung Warawaf RT 02',
            statusSiswa: 'Aktif',
          },
          {
            nis: '1003',
            nisn: '0067890125',
            namaLengkap: 'Citra Lestari',
            jenisKelamin: 'P',
            tempatTanggalLahir: 'Warawaf, 03 Maret 2014',
            kelas: 'VI',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Siti Nurhayati, S.Pd',
            alamat: 'Jl. Pelabuhan Warawaf',
            statusSiswa: 'Aktif',
          },
          {
            nis: '1004',
            nisn: '0067890126',
            namaLengkap: 'Dewi Anggraini',
            jenisKelamin: 'P',
            tempatTanggalLahir: 'Sorong, 19 November 2014',
            kelas: 'VI',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Siti Nurhayati, S.Pd',
            alamat: 'Kampung Warawaf RT 01',
            statusSiswa: 'Aktif',
          },
          {
            nis: '1005',
            nisn: '0067890127',
            namaLengkap: 'Eko Saputra',
            jenisKelamin: 'L',
            tempatTanggalLahir: 'Waisai, 07 Januari 2014',
            kelas: 'VI',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Siti Nurhayati, S.Pd',
            alamat: 'Kampung Warawaf RT 03',
            statusSiswa: 'Aktif',
          },
          {
            nis: '1006',
            nisn: '0067890128',
            namaLengkap: 'Fitri Handayani',
            jenisKelamin: 'P',
            tempatTanggalLahir: 'Warawaf, 12 Juni 2014',
            kelas: 'VI',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Siti Nurhayati, S.Pd',
            alamat: 'Kampung Warawaf RT 02',
            statusSiswa: 'Aktif',
          },
          // Kelas V (6 siswa)
          {
            nis: '2001',
            nisn: '0077890201',
            namaLengkap: 'Gilang Ramadhan',
            jenisKelamin: 'L',
            tempatTanggalLahir: 'Waisai, 09 April 2015',
            kelas: 'V',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Drs. Budi Santoso',
            alamat: 'Kampung Warawaf RT 01',
            statusSiswa: 'Aktif',
          },
          {
            nis: '2002',
            nisn: '0077890202',
            namaLengkap: 'Hana Permata',
            jenisKelamin: 'P',
            tempatTanggalLahir: 'Sorong, 25 Juli 2015',
            kelas: 'V',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Drs. Budi Santoso',
            alamat: 'Jl. Pendidikan No. 5',
            statusSiswa: 'Aktif',
          },
          {
            nis: '2003',
            nisn: '0077890203',
            namaLengkap: 'Irfan Hakim',
            jenisKelamin: 'L',
            tempatTanggalLahir: 'Warawaf, 17 Oktober 2015',
            kelas: 'V',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Drs. Budi Santoso',
            alamat: 'Kampung Warawaf RT 02',
            statusSiswa: 'Aktif',
          },
          {
            nis: '2004',
            nisn: '0077890204',
            namaLengkap: 'Juwita Sari',
            jenisKelamin: 'P',
            tempatTanggalLahir: 'Waisai, 30 Desember 2015',
            kelas: 'V',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Drs. Budi Santoso',
            alamat: 'Kampung Warawaf RT 03',
            statusSiswa: 'Aktif',
          },
          {
            nis: '2005',
            nisn: '0077890205',
            namaLengkap: 'Kevin Mambrasar',
            jenisKelamin: 'L',
            tempatTanggalLahir: 'Warawaf, 11 Februari 2015',
            kelas: 'V',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Drs. Budi Santoso',
            alamat: 'Kampung Warawaf RT 01',
            statusSiswa: 'Aktif',
          },
          // Kelas IV (3 siswa)
          {
            nis: '3001',
            nisn: '0087890301',
            namaLengkap: 'Larasati Putri',
            jenisKelamin: 'P',
            tempatTanggalLahir: 'Waisai, 18 Maret 2016',
            kelas: 'IV',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Dra. Rini Wati',
            alamat: 'Kampung Warawaf RT 02',
            statusSiswa: 'Aktif',
          },
          {
            nis: '3002',
            nisn: '0087890302',
            namaLengkap: 'Mikhael Umkeketony',
            jenisKelamin: 'L',
            tempatTanggalLahir: 'Warawaf, 05 September 2016',
            kelas: 'IV',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Dra. Rini Wati',
            alamat: 'Kampung Warawaf RT 01',
            statusSiswa: 'Aktif',
          },
          {
            nis: '3003',
            nisn: '0087890303',
            namaLengkap: 'Nadia Kusuma',
            jenisKelamin: 'P',
            tempatTanggalLahir: 'Sorong, 21 Mei 2016',
            kelas: 'IV',
            tahunPelajaran: '2026/2027',
            namaWaliKelas: 'Dra. Rini Wati',
            alamat: 'Jl. Pendidikan No. 8',
            statusSiswa: 'Aktif',
          },
        ])
        .returning();

      // 6. Subjects across PAS Ganjil, PAS Genap, Ujian Sekolah
      const insertedSubjects = await db
        .insert(subjects)
        .values([
          // Kelas VI - PAS Ganjil
          {
            kodeMapel: 'MTK-06',
            namaMapel: 'Matematika',
            kelas: 'VI',
            namaGuruPengampu: 'Siti Nurhayati, S.Pd',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
          },
          {
            kodeMapel: 'BIND-06',
            namaMapel: 'Bahasa Indonesia',
            kelas: 'VI',
            namaGuruPengampu: 'Siti Nurhayati, S.Pd',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
          },
          {
            kodeMapel: 'IPA-06',
            namaMapel: 'IPA',
            kelas: 'VI',
            namaGuruPengampu: 'Dra. Rini Wati',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
          },
          {
            kodeMapel: 'PPKN-06',
            namaMapel: 'PPKn',
            kelas: 'VI',
            namaGuruPengampu: 'Yuniarti, S.Pd',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
          },
          // Kelas V - PAS Ganjil
          {
            kodeMapel: 'MTK-05',
            namaMapel: 'Matematika',
            kelas: 'V',
            namaGuruPengampu: 'Drs. Budi Santoso',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
          },
          {
            kodeMapel: 'BIND-05',
            namaMapel: 'Bahasa Indonesia',
            kelas: 'V',
            namaGuruPengampu: 'Drs. Budi Santoso',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
          },
          // Kelas VI - PAS Genap
          {
            kodeMapel: 'MTK-06G',
            namaMapel: 'Matematika',
            kelas: 'VI',
            namaGuruPengampu: 'Siti Nurhayati, S.Pd',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'PAS Genap',
            tahunPelajaran: '2026/2027',
          },
          // Kelas VI - Ujian Sekolah
          {
            kodeMapel: 'US-MTK-06',
            namaMapel: 'Matematika',
            kelas: 'VI',
            namaGuruPengampu: 'Siti Nurhayati, S.Pd',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'Ujian Sekolah',
            tahunPelajaran: '2026/2027',
          },
          {
            kodeMapel: 'US-BIND-06',
            namaMapel: 'Bahasa Indonesia',
            kelas: 'VI',
            namaGuruPengampu: 'Siti Nurhayati, S.Pd',
            kkm: 70,
            jumlahSoal: 10,
            jenisUjian: 'Ujian Sekolah',
            tahunPelajaran: '2026/2027',
          },
        ])
        .returning();

      const mtk6 = insertedSubjects.find((s) => s.kodeMapel === 'MTK-06')!;
      const bind6 = insertedSubjects.find((s) => s.kodeMapel === 'BIND-06')!;
      const ipa6 = insertedSubjects.find((s) => s.kodeMapel === 'IPA-06')!;
      const mtk5 = insertedSubjects.find((s) => s.kodeMapel === 'MTK-05')!;
      const usMtk6 = insertedSubjects.find((s) => s.kodeMapel === 'US-MTK-06')!;

      // 7. Exam Papers & Answer Keys
      const sampleKeys10 = ['A', 'C', 'B', 'D', 'A', 'B', 'C', 'D', 'A', 'C'];
      const sampleKeysBind = ['B', 'A', 'D', 'C', 'B', 'A', 'C', 'D', 'B', 'A'];
      const sampleKeysIpa = ['C', 'B', 'A', 'D', 'C', 'D', 'A', 'B', 'C', 'D'];

      const insertedPapers = await db
        .insert(examPapers)
        .values([
          {
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
            kelas: 'VI',
            subjectId: mtk6.id,
            namaMataPelajaran: mtk6.namaMapel,
            guruPengampu: mtk6.namaGuruPengampu,
            jumlahSoal: 10,
            tipePenilaian: 'Pilihan Ganda A-D',
          },
          {
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
            kelas: 'VI',
            subjectId: bind6.id,
            namaMataPelajaran: bind6.namaMapel,
            guruPengampu: bind6.namaGuruPengampu,
            jumlahSoal: 10,
            tipePenilaian: 'Pilihan Ganda A-D',
          },
          {
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
            kelas: 'VI',
            subjectId: ipa6.id,
            namaMataPelajaran: ipa6.namaMapel,
            guruPengampu: ipa6.namaGuruPengampu,
            jumlahSoal: 10,
            tipePenilaian: 'Pilihan Ganda A-D',
          },
          {
            jenisUjian: 'PAS Ganjil',
            tahunPelajaran: '2026/2027',
            kelas: 'V',
            subjectId: mtk5.id,
            namaMataPelajaran: mtk5.namaMapel,
            guruPengampu: mtk5.namaGuruPengampu,
            jumlahSoal: 10,
            tipePenilaian: 'Pilihan Ganda A-D',
          },
          {
            jenisUjian: 'Ujian Sekolah',
            tahunPelajaran: '2026/2027',
            kelas: 'VI',
            subjectId: usMtk6.id,
            namaMataPelajaran: usMtk6.namaMapel,
            guruPengampu: usMtk6.namaGuruPengampu,
            jumlahSoal: 10,
            tipePenilaian: 'Pilihan Ganda A-D',
          },
        ])
        .returning();

      const paperMtk6 = insertedPapers[0];
      const paperBind6 = insertedPapers[1];
      const paperIpa6 = insertedPapers[2];
      const paperMtk5 = insertedPapers[3];
      const paperUsMtk6 = insertedPapers[4];

      const questionRows = [
        ...sampleKeys10.map((k, idx) => ({
          examPaperId: paperMtk6.id,
          nomorSoal: idx + 1,
          tipeSoal: 'Pilihan Ganda A-D',
          pertanyaan: `Soal Matematika Kelas VI Nomor ${idx + 1}`,
          opsiA: 'Pilihan A',
          opsiB: 'Pilihan B',
          opsiC: 'Pilihan C',
          opsiD: 'Pilihan D',
          kunciJawaban: k,
          bobot: 1,
        })),
        ...sampleKeysBind.map((k, idx) => ({
          examPaperId: paperBind6.id,
          nomorSoal: idx + 1,
          tipeSoal: 'Pilihan Ganda A-D',
          pertanyaan: `Soal Bahasa Indonesia Kelas VI Nomor ${idx + 1}`,
          opsiA: 'Pilihan A',
          opsiB: 'Pilihan B',
          opsiC: 'Pilihan C',
          opsiD: 'Pilihan D',
          kunciJawaban: k,
          bobot: 1,
        })),
        ...sampleKeysIpa.map((k, idx) => ({
          examPaperId: paperIpa6.id,
          nomorSoal: idx + 1,
          tipeSoal: 'Pilihan Ganda A-D',
          pertanyaan: `Soal IPA Kelas VI Nomor ${idx + 1}`,
          opsiA: 'Pilihan A',
          opsiB: 'Pilihan B',
          opsiC: 'Pilihan C',
          opsiD: 'Pilihan D',
          kunciJawaban: k,
          bobot: 1,
        })),
        ...sampleKeys10.map((k, idx) => ({
          examPaperId: paperMtk5.id,
          nomorSoal: idx + 1,
          tipeSoal: 'Pilihan Ganda A-D',
          pertanyaan: `Soal Matematika Kelas V Nomor ${idx + 1}`,
          opsiA: 'Pilihan A',
          opsiB: 'Pilihan B',
          opsiC: 'Pilihan C',
          opsiD: 'Pilihan D',
          kunciJawaban: k,
          bobot: 1,
        })),
        ...sampleKeys10.map((k, idx) => ({
          examPaperId: paperUsMtk6.id,
          nomorSoal: idx + 1,
          tipeSoal: 'Pilihan Ganda A-D',
          pertanyaan: `Soal Ujian Sekolah Matematika Nomor ${idx + 1}`,
          opsiA: 'Pilihan A',
          opsiB: 'Pilihan B',
          opsiC: 'Pilihan C',
          opsiD: 'Pilihan D',
          kunciJawaban: k,
          bobot: 1,
        })),
      ];

      await db.insert(questions).values(questionRows);

      // 8. Sample Grading Results for Kelas VI & V
      const kelas6Students = insertedStudents.filter((s) => s.kelas === 'VI');
      const kelas5Students = insertedStudents.filter((s) => s.kelas === 'V');

      const buildGradingRow = (
        paperId: number,
        studentId: number,
        subjectId: number,
        jenisUjian: string,
        kelas: string,
        keys: string[],
        wrongIndices: number[]
      ) => {
        const jawabanSiswa: Record<string, string> = {};
        let benar = 0;
        let salah = 0;
        keys.forEach((key, idx) => {
          const num = String(idx + 1);
          if (wrongIndices.includes(idx)) {
            const alt = key === 'A' ? 'B' : 'A';
            jawabanSiswa[num] = alt;
            salah++;
          } else {
            jawabanSiswa[num] = key;
            benar++;
          }
        });
        const nilai = Number(((benar / keys.length) * 100).toFixed(2));
        return {
          examPaperId: paperId,
          studentId,
          subjectId,
          jenisUjian,
          tahunPelajaran: '2026/2027',
          kelas,
          jawabanSiswa,
          jumlahSoal: keys.length,
          jawabanBenar: benar,
          jawabanSalah: salah,
          tidakDijawab: 0,
          nilaiAkhir: nilai,
          kkm: 70,
          statusKetuntasan: nilai >= 70 ? 'TUNTAS' : 'BELUM TUNTAS',
          gradedBy: 'Siti Nurhayati, S.Pd',
          editHistory: [],
        };
      };

      const gradingRows = [
        // Kelas VI - Matematika PAS Ganjil
        buildGradingRow(paperMtk6.id, kelas6Students[0].id, mtk6.id, 'PAS Ganjil', 'VI', sampleKeys10, [3]), // 90
        buildGradingRow(paperMtk6.id, kelas6Students[1].id, mtk6.id, 'PAS Ganjil', 'VI', sampleKeys10, [3, 6]), // 80
        buildGradingRow(paperMtk6.id, kelas6Students[2].id, mtk6.id, 'PAS Ganjil', 'VI', sampleKeys10, [1, 4, 8]), // 70
        buildGradingRow(paperMtk6.id, kelas6Students[3].id, mtk6.id, 'PAS Ganjil', 'VI', sampleKeys10, [0, 2, 5, 7]), // 60 (Belum Tuntas)
        buildGradingRow(paperMtk6.id, kelas6Students[4].id, mtk6.id, 'PAS Ganjil', 'VI', sampleKeys10, []), // 100
        buildGradingRow(paperMtk6.id, kelas6Students[5].id, mtk6.id, 'PAS Ganjil', 'VI', sampleKeys10, [2, 9]), // 80
        // Kelas VI - Bahasa Indonesia PAS Ganjil
        buildGradingRow(paperBind6.id, kelas6Students[0].id, bind6.id, 'PAS Ganjil', 'VI', sampleKeysBind, [2]), // 90
        buildGradingRow(paperBind6.id, kelas6Students[1].id, bind6.id, 'PAS Ganjil', 'VI', sampleKeysBind, [1, 5]), // 80
        buildGradingRow(paperBind6.id, kelas6Students[2].id, bind6.id, 'PAS Ganjil', 'VI', sampleKeysBind, [0]), // 90
        buildGradingRow(paperBind6.id, kelas6Students[3].id, bind6.id, 'PAS Ganjil', 'VI', sampleKeysBind, [0, 3, 6, 9]), // 60
        buildGradingRow(paperBind6.id, kelas6Students[4].id, bind6.id, 'PAS Ganjil', 'VI', sampleKeysBind, [4, 7]), // 80
        buildGradingRow(paperBind6.id, kelas6Students[5].id, bind6.id, 'PAS Ganjil', 'VI', sampleKeysBind, [8]), // 90
        // Kelas VI - IPA PAS Ganjil
        buildGradingRow(paperIpa6.id, kelas6Students[0].id, ipa6.id, 'PAS Ganjil', 'VI', sampleKeysIpa, [1, 6]), // 80
        buildGradingRow(paperIpa6.id, kelas6Students[1].id, ipa6.id, 'PAS Ganjil', 'VI', sampleKeysIpa, [0, 3, 7]), // 70
        buildGradingRow(paperIpa6.id, kelas6Students[2].id, ipa6.id, 'PAS Ganjil', 'VI', sampleKeysIpa, [4]), // 90
        // Kelas V - Matematika PAS Ganjil
        buildGradingRow(paperMtk5.id, kelas5Students[0].id, mtk5.id, 'PAS Ganjil', 'V', sampleKeys10, [1]), // 90
        buildGradingRow(paperMtk5.id, kelas5Students[1].id, mtk5.id, 'PAS Ganjil', 'V', sampleKeys10, [0, 2]), // 80
        buildGradingRow(paperMtk5.id, kelas5Students[2].id, mtk5.id, 'PAS Ganjil', 'V', sampleKeys10, [3, 5, 7, 9]), // 60
        // Kelas VI - Ujian Sekolah Matematika
        buildGradingRow(paperUsMtk6.id, kelas6Students[0].id, usMtk6.id, 'Ujian Sekolah', 'VI', sampleKeys10, [5]), // 90
        buildGradingRow(paperUsMtk6.id, kelas6Students[1].id, usMtk6.id, 'Ujian Sekolah', 'VI', sampleKeys10, [2, 8]), // 80
      ];

      await db.insert(gradingResults).values(gradingRows);

      // 9. Sample Exam Attendances
      const attendanceRows = [
        ...kelas6Students.map((s, idx) => ({
          studentId: s.id,
          subjectId: mtk6.id,
          jenisUjian: 'PAS Ganjil',
          tahunPelajaran: '2026/2027',
          kelas: 'VI',
          tanggalUjian: '2026-12-07',
          statusKehadiran: idx === 3 ? 'Sakit' : 'Hadir',
          recordedBy: 'Siti Nurhayati, S.Pd',
        })),
        ...kelas5Students.map((s, idx) => ({
          studentId: s.id,
          subjectId: mtk5.id,
          jenisUjian: 'PAS Ganjil',
          tahunPelajaran: '2026/2027',
          kelas: 'V',
          tanggalUjian: '2026-12-07',
          statusKehadiran: idx === 4 ? 'Izin' : 'Hadir',
          recordedBy: 'Drs. Budi Santoso',
        })),
      ];
      await db.insert(examAttendances).values(attendanceRows);

      // 10. Activity Logs
      await db.insert(activityLogs).values([
        {
          userName: 'Siti Nurhayati, S.Pd',
          userRole: 'Wali Kelas',
          action: 'Koreksi Otomatis',
          module: 'Koreksi Soal',
          details: 'Menyimpan hasil koreksi Matematika Kelas VI (PAS Ganjil) untuk 6 siswa.',
        },
        {
          userName: 'Drs. Budi Santoso',
          userRole: 'Guru',
          action: 'Simpan Absensi',
          module: 'Absensi Ujian',
          details: 'Mencatat kehadiran ujian Matematika Kelas V tanggal 2026-12-07.',
        },
        {
          userName: 'Administrator Sekolah',
          userRole: 'Administrator',
          action: 'Inisialisasi Sistem',
          module: 'Data Sekolah',
          details: 'Profil SD Negeri Warawaf dan Tahun Pelajaran 2026/2027 berhasil dikonfigurasi.',
        },
      ]);
    } catch (error) {
      seedPromise = null;
      console.error('Failed to seed initial school assessment data:', error);
      throw new Error('Gagal menyiapkan data awal sekolah.', { cause: error });
    }
  })();

  return seedPromise;
}
