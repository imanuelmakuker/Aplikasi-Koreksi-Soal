import React from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';
import { DashboardData, NavSection } from '../types.ts';

interface DashboardViewProps {
  data: DashboardData | null;
  tahunPelajaran: string;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (section: NavSection) => void;
}

export function DashboardView({
  data,
  tahunPelajaran,
  loading,
  onRefresh,
  onNavigate,
}: DashboardViewProps) {
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-xl bg-white border border-slate-200" />
          <div className="h-72 rounded-xl bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  const kpi = data?.kpi ?? {
    totalSiswa: 0,
    totalGuru: 0,
    totalMapel: 0,
    totalSoal: 0,
    totalHasilKoreksi: 0,
    totalPesertaUjian: 0,
    siswaTuntas: 0,
    siswaBelumTuntas: 0,
    persentaseKetuntasan: 0,
  };

  const charts = data?.charts ?? {
    distribution: { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 },
    averageBySubject: [],
    averageByClass: [],
    comparisonByExamType: [],
    attendanceStats: { total: 0, Hadir: 0, Sakit: 0, Izin: 0, 'Tanpa Keterangan': 0 },
  };

  const totalDist = Object.values(charts.distribution).reduce((a, b) => a + b, 0) || 1;
  const tuntasPct = kpi.persentaseKetuntasan;
  const belumPct = kpi.totalHasilKoreksi > 0 ? Number((100 - tuntasPct).toFixed(2)) : 0;

  // Attendance percentages
  const totalAtt = charts.attendanceStats.total || 1;
  const hadirPct = Math.round((charts.attendanceStats.Hadir / totalAtt) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl bg-gradient-to-r from-[#0B2447] via-[#10305E] to-[#17417B] text-white p-5 flex flex-wrap items-center justify-between gap-4 border border-[#0B2447]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Dashboard Ringkasan Penilaian</h2>
          <p className="text-sm text-slate-200 mt-0.5">
            Statistik terintegrasi Tahun Pelajaran {tahunPelajaran} · PAS Ganjil, PAS Genap &amp; Ujian Sekolah
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Muat Ulang Data
        </button>
      </div>

      {/* Primary KPI Row (4 Dominant Navy/Gold Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('students')}
          className="text-left rounded-xl p-5 bg-[#0B2447] text-white hover:bg-[#113260] transition-colors border border-[#19437D]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Total Siswa Aktif</span>
            <GraduationCap className="w-5 h-5 text-[#EBC556]" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums">{kpi.totalSiswa}</div>
          <div className="mt-1 text-xs text-slate-300">Peserta Ujian: {kpi.totalPesertaUjian} siswa</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ptk')}
          className="text-left rounded-xl p-5 bg-[#0F2F5C] text-white hover:bg-[#163D73] transition-colors border border-[#1E4B8A]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Total Guru / PTK</span>
            <Users className="w-5 h-5 text-[#EBC556]" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums">{kpi.totalGuru}</div>
          <div className="mt-1 text-xs text-slate-300">Mata Pelajaran: {kpi.totalMapel} mapel</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('questions')}
          className="text-left rounded-xl p-5 bg-[#133A70] text-white hover:bg-[#194787] transition-colors border border-[#2357A0]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">Total Soal Tersimpan</span>
            <FileText className="w-5 h-5 text-[#EBC556]" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums">{kpi.totalSoal}</div>
          <div className="mt-1 text-xs text-slate-300">Hasil Koreksi: {kpi.totalHasilKoreksi} nilai</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('grades')}
          className="text-left rounded-xl p-5 bg-gradient-to-br from-[#C5951E] to-[#E0B542] text-[#0B2447] hover:brightness-105 transition-all border border-[#B8891B]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0B2447]/80">Persentase Ketuntasan</span>
            <Award className="w-5 h-5 text-[#0B2447]" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums">
            {kpi.persentaseKetuntasan.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs font-semibold text-[#0B2447]/85">
            {kpi.siswaTuntas} Tuntas · {kpi.siswaBelumTuntas} Belum Tuntas
          </div>
        </button>
      </div>

      {/* Secondary Detailed Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BookOpen className="w-3.5 h-3.5 text-[#0B2447]" />
            <span>Total Mata Pelajaran</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
            {kpi.totalMapel}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ClipboardCheck className="w-3.5 h-3.5 text-[#0B2447]" />
            <span>Total Hasil Koreksi</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
            {kpi.totalHasilKoreksi}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0B2447]" />
            <span>Total Peserta Ujian</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
            {kpi.totalPesertaUjian}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Penilaian Tuntas</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-700">
            {kpi.siswaTuntas}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-red-700">
            <XCircle className="w-3.5 h-3.5" />
            <span>Belum Tuntas</span>
          </div>
          <div className="mt-1 text-xl font-bold font-mono tabular-nums text-red-700">
            {kpi.siswaBelumTuntas}
          </div>
        </div>
      </div>

      {/* Charts Grid Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Perbandingan Tuntas vs Belum Tuntas + Distribusi Nilai */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0B2447]">
              Perbandingan Siswa Tuntas &amp; Belum Tuntas
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {kpi.totalHasilKoreksi} data
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* CSS Conic Donut */}
            <div
              className="w-32 h-32 rounded-full shrink-0 flex items-center justify-center relative"
              style={{
                background:
                  kpi.totalHasilKoreksi > 0
                    ? `conic-gradient(#16A34A 0% ${tuntasPct}%, #DC2626 ${tuntasPct}% 100%)`
                    : '#E2E8F0',
              }}
            >
              <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono tabular-nums text-[#0B2447]">
                  {tuntasPct.toFixed(0)}%
                </span>
                <span className="text-[11px] text-slate-500">Tuntas</span>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tuntas (&ge; KKM)
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {kpi.siswaTuntas} ({tuntasPct.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-slate-700">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Belum Tuntas
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {kpi.siswaBelumTuntas} ({belumPct.toFixed(1)}%)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                {Object.entries(charts.distribution).map(([range, count]) => (
                  <div key={range} className="flex items-center justify-between text-slate-600">
                    <span>Rentang {range}</span>
                    <span className="font-mono tabular-nums">
                      {count} ({Math.round((count / totalDist) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rata-rata Nilai Setiap Mata Pelajaran */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#0B2447]">
              Rata-Rata Nilai Setiap Mata Pelajaran
            </h3>
            <span className="text-xs text-slate-500">Skala 0 – 100</span>
          </div>

          {charts.averageBySubject.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Belum ada data nilai yang dikoreksi pada tahun pelajaran ini.
            </div>
          ) : (
            <div className="space-y-3.5">
              {charts.averageBySubject.map((item) => (
                <div key={item.subjectName} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{item.subjectName}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#0B2447]">
                      {item.average.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-500">({item.count} nilai)</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0B2447] to-[#2563EB]"
                      style={{ width: `${Math.min(100, item.average)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Perbandingan PAS Ganjil, PAS Genap, Ujian Sekolah */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0B2447]">
              Perbandingan PAS Ganjil, PAS Genap &amp; Ujian Sekolah
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {charts.comparisonByExamType.map((item) => (
              <div
                key={item.jenisUjian}
                className="rounded-lg border border-slate-200 p-4 bg-slate-50/60 space-y-2"
              >
                <div className="text-xs font-semibold text-[#0B2447]">{item.jenisUjian}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  {item.average.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500">
                  Ketuntasan: <span className="font-semibold text-emerald-700">{item.passRate}%</span>
                </div>
                <div className="text-xs text-slate-500">Total Koreksi: {item.totalGraded}</div>
              </div>
            ))}
          </div>

          {/* Prestasi per Kelas */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-600 mb-3">
              Rata-Rata Prestasi per Kelas (I – VI)
            </div>
            <div className="grid grid-cols-6 gap-2 items-end h-28 pt-4">
              {charts.averageByClass.map((cls) => (
                <div key={cls.kelas} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[11px] font-mono tabular-nums font-semibold text-slate-700">
                    {cls.average > 0 ? cls.average.toFixed(0) : '-'}
                  </span>
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t-md flex-1 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-[#0B2447] rounded-t-md transition-all"
                      style={{ height: `${Math.max(4, cls.average)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">Kls {cls.kelas}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistik Kehadiran Peserta Ujian */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0B2447]">Statistik Kehadiran Peserta Ujian</h3>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#0B2447] hover:underline"
            >
              Kelola Absensi
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div
              className="w-28 h-28 rounded-full shrink-0 flex items-center justify-center"
              style={{
                background:
                  charts.attendanceStats.total > 0
                    ? `conic-gradient(#16A34A 0% ${hadirPct}%, #D97706 ${hadirPct}% 100%)`
                    : '#E2E8F0',
              }}
            >
              <div className="w-18 h-18 rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-base font-bold font-mono tabular-nums text-[#0B2447]">
                  {charts.attendanceStats.total > 0 ? `${hadirPct}%` : '0%'}
                </span>
                <span className="text-[11px] text-slate-500">Hadir</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Hadir</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  {charts.attendanceStats.Hadir}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Sakit</span>
                <span className="font-mono tabular-nums font-semibold text-amber-600">
                  {charts.attendanceStats.Sakit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Izin</span>
                <span className="font-mono tabular-nums font-semibold text-blue-600">
                  {charts.attendanceStats.Izin}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tanpa Keterangan</span>
                <span className="font-mono tabular-nums font-semibold text-red-600">
                  {charts.attendanceStats['Tanpa Keterangan']}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity Log Mini Table */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-600 mb-2">Aktivitas Terbaru</div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {(data?.recentLogs || []).slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between text-slate-800 font-medium">
                    <span>{log.action}</span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {new Date(log.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <p className="text-slate-500 truncate">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
