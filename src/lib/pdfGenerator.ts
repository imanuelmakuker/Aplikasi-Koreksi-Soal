import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExamAttendance, GradingResult, Ptk, School, Student, Subject } from '../types.ts';

interface SignatureBlockParams {
  doc: jsPDF;
  school: School | null;
  rightTitle: string;
  rightName: string;
  rightNip: string;
  rightSignature?: string;
}

function drawSchoolHeader(doc: jsPDF, school: School | null, docTitle: string, subtitle?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 15;
  const rightMargin = 15;

  // Optional logo image on the left
  if (school?.logoSekolah && school.logoSekolah.startsWith('data:image/')) {
    try {
      const format = school.logoSekolah.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(school.logoSekolah, format, leftMargin, 10, 18, 18);
    } catch {
      // Ignore invalid image data
    }
  } else {
    // Draw clean navy & gold emblem badge
    doc.setFillColor(11, 36, 71);
    doc.roundedRect(leftMargin, 11, 16, 16, 2, 2, 'F');
    doc.setDrawColor(212, 166, 42);
    doc.setLineWidth(0.6);
    doc.roundedRect(leftMargin + 1, 12, 14, 14, 1.5, 1.5, 'S');
    doc.setTextColor(235, 197, 86);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SD', leftMargin + 8, 20.5, { align: 'center' });
  }

  const centerX = pageWidth / 2;
  doc.setTextColor(11, 36, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((school?.namaSekolah || 'SD NEGERI WARAWAF').toUpperCase(), centerX, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const addressLine = school
    ? `${school.alamatSekolah}, ${school.desaKampung}, Distrik ${school.distrik}, Kab. ${school.kabupaten}, ${school.provinsi} ${school.kodePos}`
    : 'Jl. Pendidikan No. 12, Warawaf';
  doc.text(addressLine, centerX, 20, { align: 'center' });
  doc.text(
    `NPSN: ${school?.npsn || '-'} · Status: ${school?.statusSekolah || 'Negeri'} · Tahun Pelajaran: ${school?.tahunPelajaran || '2026/2027'}`,
    centerX,
    24.5,
    { align: 'center' }
  );

  // Navy + Gold double letterhead line
  doc.setDrawColor(11, 36, 71);
  doc.setLineWidth(0.8);
  doc.line(leftMargin, 29, pageWidth - rightMargin, 29);
  doc.setDrawColor(212, 166, 42);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, 30.5, pageWidth - rightMargin, 30.5);

  doc.setTextColor(11, 36, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(docTitle.toUpperCase(), centerX, 37, { align: 'center' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, centerX, 42, { align: 'center' });
    return 47;
  }
  return 43;
}

function drawSignatureBlock({
  doc,
  school,
  rightTitle,
  rightName,
  rightNip,
  rightSignature,
}: SignatureBlockParams) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const finalY = (doc as any).lastAutoTable?.finalY ?? 120;

  let startY = finalY + 12;
  // Ensure signature block never gets cut across pages
  if (startY + 42 > pageHeight - 16) {
    doc.addPage();
    startY = 24;
  }

  const leftX = 24;
  const rightX = pageWidth - 82;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Left: Kepala Sekolah
  doc.text('Mengetahui,', leftX, startY);
  doc.text('Kepala Sekolah', leftX, startY + 5);

  if (school?.ttdKepalaSekolah && school.ttdKepalaSekolah.startsWith('data:image/')) {
    try {
      const fmt = school.ttdKepalaSekolah.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(school.ttdKepalaSekolah, fmt, leftX, startY + 7, 36, 16);
    } catch {
      // Ignore invalid signature
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.text(school?.namaKepalaSekolah || 'Nama Kepala Sekolah', leftX, startY + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${school?.nipKepalaSekolah || '........................'}`, leftX, startY + 33);

  // Right: Wali Kelas / Guru Mapel
  doc.text(school?.tempatTanggal || 'Warawaf, 2026', rightX, startY);
  doc.text(rightTitle, rightX, startY + 5);

  if (rightSignature && rightSignature.startsWith('data:image/')) {
    try {
      const fmt = rightSignature.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(rightSignature, fmt, rightX, startY + 7, 36, 16);
    } catch {
      // Ignore invalid signature
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.text(rightName || 'Nama Guru', rightX, startY + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${rightNip || '........................'}`, rightX, startY + 33);
}

function applyPageFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const timestamp = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dicetak pada: ${timestamp}`, 15, pageHeight - 8);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  }
}

export function generateSubjectGradesPdf(params: {
  school: School | null;
  subject: Subject;
  jenisUjian: string;
  tahunPelajaran: string;
  kelas: string;
  rows: Array<{
    student: Student;
    grade: GradingResult;
  }>;
  teacherPtk?: Ptk | null;
}) {
  const { school, subject, jenisUjian, tahunPelajaran, kelas, rows, teacherPtk } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  let y = drawSchoolHeader(
    doc,
    school,
    'Daftar Nilai Siswa per Mata Pelajaran',
    `Jenis Ujian: ${jenisUjian} · Tahun Pelajaran: ${tahunPelajaran}`
  );

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Mata Pelajaran : ${subject.namaMapel} (${subject.kodeMapel})`, 15, y);
  doc.text(`Kelas : ${kelas}`, 140, y);
  doc.text(`KKM : ${subject.kkm}`, 210, y);
  y += 5;

  const tuntas = rows.filter((r) => r.grade.statusKetuntasan === 'TUNTAS').length;
  const belumTuntas = rows.length - tuntas;
  const scores = rows.map((r) => r.grade.nilaiAkhir);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '0.00';

  autoTable(doc, {
    startY: y,
    head: [
      ['No', 'NIS', 'NISN', 'Nama Siswa', 'Jml Soal', 'Benar', 'Salah', 'Nilai', 'KKM', 'Keterangan'],
    ],
    body: rows.map((r, idx) => [
      idx + 1,
      r.student.nis,
      r.student.nisn || '-',
      r.student.namaLengkap,
      r.grade.jumlahSoal,
      r.grade.jawabanBenar,
      r.grade.jawabanSalah,
      r.grade.nilaiAkhir.toFixed(2),
      r.grade.kkm,
      r.grade.statusKetuntasan,
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 16 },
      7: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      8: { halign: 'center', cellWidth: 16 },
      9: { halign: 'center', cellWidth: 32 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 9) {
        if (data.cell.raw === 'TUNTAS') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 15, right: 15 },
  });

  const afterTableY = ((doc as any).lastAutoTable?.finalY ?? 100) + 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Ringkasan: Peserta = ${rows.length} siswa · Tuntas = ${tuntas} · Belum Tuntas = ${belumTuntas} · Rata-rata Kelas = ${avg}`,
    15,
    afterTableY
  );

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Guru Mata Pelajaran / Wali Kelas ${kelas}`,
    rightName: teacherPtk?.namaLengkap || subject.namaGuruPengampu,
    rightNip: teacherPtk?.nip || '',
    rightSignature: teacherPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Daftar_Nilai_${subject.namaMapel}_Kelas_${kelas}_${jenisUjian}.pdf`.replace(/\s+/g, '_'));
}

export function generateAttendancePdf(params: {
  school: School | null;
  subject: Subject;
  jenisUjian: string;
  tahunPelajaran: string;
  kelas: string;
  tanggalUjian: string;
  rows: Array<{ student: Student; statusKehadiran: string }>;
  teacherPtk?: Ptk | null;
}) {
  const { school, subject, jenisUjian, tahunPelajaran, kelas, tanggalUjian, rows, teacherPtk } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawSchoolHeader(
    doc,
    school,
    'Daftar Hadir Peserta Ujian',
    `Jenis Ujian: ${jenisUjian} · Tahun Pelajaran: ${tahunPelajaran}`
  );

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Mata Pelajaran : ${subject.namaMapel}`, 15, y);
  doc.text(`Kelas : ${kelas}`, 110, y);
  doc.text(`Tanggal : ${tanggalUjian}`, 150, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['No', 'NISN', 'Nama Lengkap Siswa', 'L/P', 'Keterangan Kehadiran']],
    body: rows.map((r, idx) => [
      idx + 1,
      r.student.nisn || r.student.nis,
      r.student.namaLengkap,
      r.student.jenisKelamin,
      r.statusKehadiran,
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'center', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 42 },
    },
    margin: { left: 15, right: 15 },
  });

  const hadir = rows.filter((r) => r.statusKehadiran === 'Hadir').length;
  const sakit = rows.filter((r) => r.statusKehadiran === 'Sakit').length;
  const izin = rows.filter((r) => r.statusKehadiran === 'Izin').length;
  const alpa = rows.filter((r) => r.statusKehadiran === 'Tanpa Keterangan').length;

  const afterTableY = ((doc as any).lastAutoTable?.finalY ?? 120) + 6;
  doc.setFontSize(8.5);
  doc.text(
    `Rekap Kehadiran: Hadir = ${hadir} · Sakit = ${sakit} · Izin = ${izin} · Tanpa Keterangan = ${alpa} · Total = ${rows.length}`,
    15,
    afterTableY
  );

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Pengawas / Wali Kelas ${kelas}`,
    rightName: teacherPtk?.namaLengkap || subject.namaGuruPengampu,
    rightNip: teacherPtk?.nip || '',
    rightSignature: teacherPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Absensi_Ujian_${subject.namaMapel}_Kelas_${kelas}_${tanggalUjian}.pdf`.replace(/\s+/g, '_'));
}

export function generateStudentReportPdf(params: {
  school: School | null;
  student: Student;
  jenisUjian: string;
  tahunPelajaran: string;
  rows: Array<{ subject: Subject; grade: GradingResult | null }>;
  waliKelasPtk?: Ptk | null;
}) {
  const { school, student, jenisUjian, tahunPelajaran, rows, waliKelasPtk } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawSchoolHeader(
    doc,
    school,
    'Rapor Hasil Penilaian Ujian Siswa',
    `${jenisUjian} · Tahun Pelajaran ${tahunPelajaran}`
  );

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nama Siswa : ${student.namaLengkap}`, 15, y);
  doc.text(`Kelas : ${student.kelas}`, 140, y);
  y += 5;
  doc.text(`NIS / NISN : ${student.nis} / ${student.nisn || '-'}`, 15, y);
  doc.text(`Wali Kelas : ${student.namaWaliKelas || waliKelasPtk?.namaLengkap || '-'}`, 140, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['No', 'Kode', 'Mata Pelajaran', 'KKM', 'Benar / Soal', 'Nilai Akhir', 'Ketuntasan']],
    body: rows.map((r, idx) => [
      idx + 1,
      r.subject.kodeMapel,
      r.subject.namaMapel,
      r.subject.kkm,
      r.grade ? `${r.grade.jawabanBenar}/${r.grade.jumlahSoal}` : '-',
      r.grade ? r.grade.nilaiAkhir.toFixed(2) : '-',
      r.grade ? r.grade.statusKetuntasan : 'BELUM DIKOREKSI',
    ]),
    styles: { fontSize: 9, cellPadding: 2.8, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 34 },
    },
    margin: { left: 15, right: 15 },
  });

  const graded = rows.filter((r) => r.grade !== null);
  const avg = graded.length
    ? (graded.reduce((s, r) => s + (r.grade?.nilaiAkhir || 0), 0) / graded.length).toFixed(2)
    : '0.00';
  const tuntasCount = graded.filter((r) => r.grade?.statusKetuntasan === 'TUNTAS').length;

  const afterTableY = ((doc as any).lastAutoTable?.finalY ?? 120) + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    `Rata-rata Nilai: ${avg} · Mata Pelajaran Tuntas: ${tuntasCount} dari ${graded.length}`,
    15,
    afterTableY
  );

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Wali Kelas ${student.kelas}`,
    rightName: waliKelasPtk?.namaLengkap || student.namaWaliKelas || 'Wali Kelas',
    rightNip: waliKelasPtk?.nip || '',
    rightSignature: waliKelasPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Rapor_Nilai_${student.namaLengkap}_${jenisUjian}.pdf`.replace(/\s+/g, '_'));
}

export function generateClassRecapPdf(params: {
  school: School | null;
  kelas: string;
  jenisUjian: string;
  tahunPelajaran: string;
  subjectsList: Subject[];
  studentsList: Student[];
  grades: GradingResult[];
  waliKelasPtk?: Ptk | null;
}) {
  const { school, kelas, jenisUjian, tahunPelajaran, subjectsList, studentsList, grades, waliKelasPtk } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const y = drawSchoolHeader(
    doc,
    school,
    `Rekapitulasi Nilai Kelas ${kelas}`,
    `Jenis Ujian: ${jenisUjian} · Tahun Pelajaran: ${tahunPelajaran}`
  );

  const head = [
    'No',
    'NIS',
    'Nama Siswa',
    ...subjectsList.map((s) => s.namaMapel),
    'Jumlah',
    'Rata-rata',
    'Tuntas',
  ];

  const body = studentsList.map((stu, idx) => {
    const scores = subjectsList.map((subj) => {
      const g = grades.find(
        (gr) =>
          gr.studentId === stu.id &&
          gr.subjectId === subj.id &&
          gr.jenisUjian === jenisUjian &&
          gr.tahunPelajaran === tahunPelajaran
      );
      return g ? g : null;
    });
    const valid = scores.filter((s): s is GradingResult => s !== null);
    const total = valid.reduce((a, b) => a + b.nilaiAkhir, 0);
    const avg = valid.length > 0 ? (total / valid.length).toFixed(2) : '-';
    const tuntas = valid.filter((v) => v.statusKetuntasan === 'TUNTAS').length;

    return [
      idx + 1,
      stu.nis,
      stu.namaLengkap,
      ...scores.map((s) => (s ? s.nilaiAkhir.toFixed(0) : '-')),
      valid.length > 0 ? total.toFixed(0) : '-',
      avg,
      `${tuntas}/${valid.length}`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 },
  });

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Wali Kelas ${kelas}`,
    rightName: waliKelasPtk?.namaLengkap || 'Wali Kelas',
    rightNip: waliKelasPtk?.nip || '',
    rightSignature: waliKelasPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Rekapitulasi_Nilai_Kelas_${kelas}_${jenisUjian}.pdf`.replace(/\s+/g, '_'));
}

export function generateMasteryRecapPdf(params: {
  school: School | null;
  kelas: string;
  jenisUjian: string;
  tahunPelajaran: string;
  rows: Array<{
    student: Student;
    totalSubjects: number;
    tuntasCount: number;
    belumTuntasCount: number;
    average: number;
  }>;
  waliKelasPtk?: Ptk | null;
}) {
  const { school, kelas, jenisUjian, tahunPelajaran, rows, waliKelasPtk } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const y = drawSchoolHeader(
    doc,
    school,
    `Rekap Ketuntasan Belajar Siswa Kelas ${kelas}`,
    `Jenis Ujian: ${jenisUjian} · Tahun Pelajaran: ${tahunPelajaran}`
  );

  autoTable(doc, {
    startY: y,
    head: [['No', 'NIS', 'Nama Siswa', 'Mapel Dinilai', 'Tuntas', 'Belum Tuntas', 'Rata-rata']],
    body: rows.map((r, idx) => [
      idx + 1,
      r.student.nis,
      r.student.namaLengkap,
      r.totalSubjects,
      r.tuntasCount,
      r.belumTuntasCount,
      r.average.toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 },
  });

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Wali Kelas ${kelas}`,
    rightName: waliKelasPtk?.namaLengkap || 'Wali Kelas',
    rightNip: waliKelasPtk?.nip || '',
    rightSignature: waliKelasPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Rekap_Ketuntasan_Kelas_${kelas}_${jenisUjian}.pdf`.replace(/\s+/g, '_'));
}

export function generateBeritaAcaraPdf(params: {
  school: School | null;
  kelas: string;
  jenisUjian: string;
  tahunPelajaran: string;
  subject: Subject;
  tanggalUjian: string;
  hadirCount: number;
  tidakHadirCount: number;
  totalPeserta: number;
  teacherPtk?: Ptk | null;
}) {
  const {
    school,
    kelas,
    jenisUjian,
    tahunPelajaran,
    subject,
    tanggalUjian,
    hadirCount,
    tidakHadirCount,
    totalPeserta,
    teacherPtk,
  } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawSchoolHeader(
    doc,
    school,
    'Berita Acara Pelaksanaan & Hasil Penilaian',
    `${jenisUjian} · Tahun Pelajaran ${tahunPelajaran}`
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  const paragraph = `Pada hari ini tanggal ${tanggalUjian}, bertempat di ${school?.namaSekolah || 'SD Negeri Warawaf'}, telah dilaksanakan kegiatan ${jenisUjian} Tahun Pelajaran ${tahunPelajaran} untuk Mata Pelajaran ${subject.namaMapel} Kelas ${kelas} dengan rincian sebagai berikut:`;
  const split = doc.splitTextToSize(paragraph, 180);
  doc.text(split, 15, y);
  y += split.length * 5.5 + 4;

  autoTable(doc, {
    startY: y,
    head: [['Keterangan', 'Rincian Data']],
    body: [
      ['Nama Sekolah / NPSN', `${school?.namaSekolah || '-'} (${school?.npsn || '-'})`],
      ['Jenis Ujian', jenisUjian],
      ['Mata Pelajaran', `${subject.namaMapel} (${subject.kodeMapel})`],
      ['Kelas / Wali / Guru Pengampu', `Kelas ${kelas} · ${subject.namaGuruPengampu}`],
      ['Jumlah Soal / KKM', `${subject.jumlahSoal} Butir Soal · KKM ${subject.kkm}`],
      ['Jumlah Peserta Terdaftar', `${totalPeserta} Siswa`],
      ['Jumlah Peserta Hadir', `${hadirCount} Siswa`],
      ['Jumlah Peserta Tidak Hadir', `${tidakHadirCount} Siswa`],
      ['Catatan Pelaksanaan', 'Ujian dan koreksi otomatis berlangsung tertib, lancar, dan akuntabel.'],
    ],
    styles: { fontSize: 9.5, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Guru Pengampu / Pengawas`,
    rightName: teacherPtk?.namaLengkap || subject.namaGuruPengampu,
    rightNip: teacherPtk?.nip || '',
    rightSignature: teacherPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Berita_Acara_${subject.namaMapel}_Kelas_${kelas}_${jenisUjian}.pdf`.replace(/\s+/g, '_'));
}

export function generateStudentsRosterPdf(params: {
  school: School | null;
  kelas: string;
  tahunPelajaran: string;
  studentsList: Student[];
  waliKelasPtk?: Ptk | null;
}) {
  const { school, kelas, tahunPelajaran, studentsList, waliKelasPtk } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const y = drawSchoolHeader(
    doc,
    school,
    `Daftar Siswa Kelas ${kelas === 'Semua' ? 'Semua Kelas' : kelas}`,
    `Tahun Pelajaran: ${tahunPelajaran}`
  );

  autoTable(doc, {
    startY: y,
    head: [['No', 'NIS', 'NISN', 'Nama Lengkap', 'L/P', 'Kelas', 'Status']],
    body: studentsList.map((s, idx) => [
      idx + 1,
      s.nis,
      s.nisn || '-',
      s.namaLengkap,
      s.jenisKelamin,
      s.kelas,
      s.statusSiswa,
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.3, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 15, right: 15 },
  });

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Wali Kelas ${kelas === 'Semua' ? '' : kelas}`,
    rightName: waliKelasPtk?.namaLengkap || 'Wali Kelas',
    rightNip: waliKelasPtk?.nip || '',
    rightSignature: waliKelasPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Daftar_Siswa_Kelas_${kelas}_${tahunPelajaran}.pdf`.replace(/\s+/g, '_'));
}

export function generateComprehensiveStudentReportPdf(params: {
  school: School | null;
  report: {
    student: Student;
    rows: Array<{
      namaMapel: string;
      kkm: number;
      pasGanjil: number | null;
      pasGenap: number | null;
      ujianSekolah: number | null;
      rataRata: number | null;
      statusAkhir: string;
    }>;
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
  };
  tahunPelajaran: string;
  waliKelasPtk?: Ptk | null;
}) {
  const { school, report, tahunPelajaran, waliKelasPtk } = params;
  const { student, rows, overallAverage, gradedSubjectCount, tuntasCount, attendanceSummary } = report;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawSchoolHeader(
    doc,
    school,
    'Rapor Hasil Belajar Siswa',
    `Ringkasan Penilaian PAS Ganjil, PAS Genap & Ujian Sekolah · Tahun Pelajaran ${tahunPelajaran}`
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nama Siswa : ${student.namaLengkap}`, 15, y);
  doc.text(`Kelas : ${student.kelas}`, 140, y);
  y += 5;
  doc.text(`NIS / NISN : ${student.nis} / ${student.nisn || '-'}`, 15, y);
  doc.text(`Wali Kelas : ${waliKelasPtk?.namaLengkap || student.namaWaliKelas || '-'}`, 140, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [
      [
        'No',
        'Mata Pelajaran',
        'KKM',
        'PAS Ganjil',
        'PAS Genap',
        'Ujian Sekolah',
        'Rata-rata',
        'Ketuntasan',
      ],
    ],
    body: rows.map((r, idx) => [
      idx + 1,
      r.namaMapel,
      r.kkm,
      r.pasGanjil !== null ? r.pasGanjil.toFixed(1) : '-',
      r.pasGenap !== null ? r.pasGenap.toFixed(1) : '-',
      r.ujianSekolah !== null ? r.ujianSekolah.toFixed(1) : '-',
      r.rataRata !== null ? r.rataRata.toFixed(2) : '-',
      r.statusAkhir,
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      2: { halign: 'center', cellWidth: 13 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 28 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'TUNTAS') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'BELUM TUNTAS') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 15, right: 15 },
  });

  const afterTableY = ((doc as any).lastAutoTable?.finalY ?? 120) + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 36, 71);
  doc.text(
    `Rata-rata Keseluruhan: ${overallAverage.toFixed(2)}   ·   Ketuntasan: ${tuntasCount} dari ${gradedSubjectCount} Mata Pelajaran`,
    15,
    afterTableY
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Rekap Kehadiran Ujian: Hadir = ${attendanceSummary.hadir} · Sakit = ${attendanceSummary.sakit} · Izin = ${attendanceSummary.izin} · Tanpa Keterangan = ${attendanceSummary.tanpaKeterangan}`,
    15,
    afterTableY + 5
  );

  drawSignatureBlock({
    doc,
    school,
    rightTitle: `Wali Kelas ${student.kelas}`,
    rightName: waliKelasPtk?.namaLengkap || student.namaWaliKelas || 'Wali Kelas',
    rightNip: waliKelasPtk?.nip || '',
    rightSignature: waliKelasPtk?.ttdDigital || '',
  });

  applyPageFooters(doc);
  doc.save(`Rapor_Hasil_Belajar_${student.namaLengkap}_${tahunPelajaran}.pdf`.replace(/\s+/g, '_'));
}

