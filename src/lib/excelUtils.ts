import * as XLSX from 'xlsx';
import { Student } from '../types.ts';

export function downloadStudentTemplate() {
  const sampleRows = [
    {
      NIS: '1099',
      NISN: '0067890999',
      'Nama Lengkap': 'Contoh Nama Siswa',
      'Jenis Kelamin (L/P)': 'L',
      'Tempat Tanggal Lahir': 'Warawaf, 12 Mei 2014',
      Kelas: 'VI',
      'Nama Wali Kelas': 'Siti Nurhayati, S.Pd',
      Alamat: 'Kampung Warawaf RT 01',
      Status: 'Aktif',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
  XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx');
}

export async function parseStudentsExcel(file: File): Promise<
  Array<{
    nis: string;
    nisn: string;
    namaLengkap: string;
    jenisKelamin: string;
    tempatTanggalLahir: string;
    kelas: string;
    namaWaliKelas: string;
    alamat: string;
    statusSiswa: string;
  }>
> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  return raw
    .map((r) => ({
      nis: String(r.NIS || r.nis || '').trim(),
      nisn: String(r.NISN || r.nisn || '').trim(),
      namaLengkap: String(r['Nama Lengkap'] || r['Nama Siswa'] || r.namaLengkap || r.nama || '').trim(),
      jenisKelamin: String(r['Jenis Kelamin (L/P)'] || r['Jenis Kelamin'] || r.JK || r.jenisKelamin || 'L')
        .trim()
        .toUpperCase()
        .startsWith('P')
        ? 'P'
        : 'L',
      tempatTanggalLahir: String(r['Tempat Tanggal Lahir'] || r.TTL || r.tempatTanggalLahir || '').trim(),
      kelas: String(r.Kelas || r.kelas || 'VI').trim(),
      namaWaliKelas: String(r['Nama Wali Kelas'] || r.namaWaliKelas || '').trim(),
      alamat: String(r.Alamat || r.alamat || '').trim(),
      statusSiswa: String(r.Status || r.statusSiswa || 'Aktif').trim(),
    }))
    .filter((row) => row.nis && row.namaLengkap);
}

export function exportStudentsExcel(students: Student[], filename = 'Data_Siswa.xlsx') {
  const rows = students.map((s, idx) => ({
    No: idx + 1,
    NIS: s.nis,
    NISN: s.nisn,
    'Nama Lengkap': s.namaLengkap,
    JK: s.jenisKelamin,
    'Tempat Tanggal Lahir': s.tempatTanggalLahir,
    Kelas: s.kelas,
    'Tahun Pelajaran': s.tahunPelajaran,
    'Wali Kelas': s.namaWaliKelas,
    Alamat: s.alamat,
    Status: s.statusSiswa,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  XLSX.writeFile(wb, filename);
}

export function downloadAnswerKeyTemplate(jumlahSoal = 10) {
  const rows = Array.from({ length: jumlahSoal }, (_, idx) => ({
    Nomor: idx + 1,
    'Kunci Jawaban': ['A', 'C', 'B', 'D'][idx % 4],
    Pertanyaan: `Pertanyaan Nomor ${idx + 1}`,
    'Opsi A': 'Pilihan A',
    'Opsi B': 'Pilihan B',
    'Opsi C': 'Pilihan C',
    'Opsi D': 'Pilihan D',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kunci Jawaban');
  XLSX.writeFile(wb, 'Template_Kunci_Jawaban.xlsx');
}

export async function parseAnswerKeyExcel(file: File): Promise<
  Array<{
    nomorSoal: number;
    kunciJawaban: string;
    pertanyaan: string;
    opsiA: string;
    opsiB: string;
    opsiC: string;
    opsiD: string;
  }>
> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  return raw
    .map((r, idx) => ({
      nomorSoal: Number(r.Nomor || r.No || r.nomorSoal || idx + 1),
      kunciJawaban: String(r['Kunci Jawaban'] || r.Kunci || r.kunciJawaban || '').trim().toUpperCase(),
      pertanyaan: String(r.Pertanyaan || r.Soal || r.pertanyaan || `Soal Nomor ${idx + 1}`).trim(),
      opsiA: String(r['Opsi A'] || r.A || '').trim(),
      opsiB: String(r['Opsi B'] || r.B || '').trim(),
      opsiC: String(r['Opsi C'] || r.C || '').trim(),
      opsiD: String(r['Opsi D'] || r.D || '').trim(),
    }))
    .filter((row) => row.nomorSoal > 0);
}

export function exportGradesExcel(
  rows: Array<Record<string, string | number>>,
  sheetName: string,
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
