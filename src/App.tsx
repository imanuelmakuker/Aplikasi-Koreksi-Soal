import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Printer,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import { AttendanceView } from './components/AttendanceView.tsx';
import { AutoGradingView } from './components/AutoGradingView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { GradesListView } from './components/GradesListView.tsx';
import { LearningReportView } from './components/LearningReportView.tsx';
import { LoginView } from './components/LoginView.tsx';
import { PdfCenterView } from './components/PdfCenterView.tsx';
import { PtkView } from './components/PtkView.tsx';
import { QuestionsView } from './components/QuestionsView.tsx';
import { RecapView } from './components/RecapView.tsx';
import { SchoolCrest } from './components/SchoolCrest.tsx';
import { SchoolDataView } from './components/SchoolDataView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { StudentsView } from './components/StudentsView.tsx';
import { SubjectsView } from './components/SubjectsView.tsx';
import { apiFetch, setAuthTokenGetter } from './lib/api.ts';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  AcademicYear,
  ActivityLog,
  AppUser,
  DashboardData,
  ExamAttendance,
  ExamPaper,
  GradingResult,
  NavSection,
  Ptk,
  Question,
  School,
  Student,
  Subject,
  UserRole,
} from './types.ts';

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'school', label: 'Data Sekolah', icon: Building2 },
  { id: 'ptk', label: 'Data PTK', icon: UserCheck },
  { id: 'students', label: 'Data Siswa', icon: GraduationCap },
  { id: 'subjects', label: 'Data Mata Pelajaran', icon: BookOpen },
  { id: 'questions', label: 'Input Soal dan Kunci Jawaban', icon: FileText },
  { id: 'grading', label: 'Koreksi Soal Otomatis', icon: ClipboardCheck },
  { id: 'attendance', label: 'Absensi Peserta Ujian', icon: CalendarCheck },
  { id: 'grades', label: 'Daftar Nilai Siswa', icon: BarChart3 },
  { id: 'recap', label: 'Rekapitulasi Nilai', icon: PieChart },
  { id: 'learning-report', label: 'Rapor Hasil Belajar', icon: Award },
  { id: 'pdf', label: 'Cetak dan Unduh PDF', icon: Printer },
  { id: 'settings', label: 'Pengaturan Aplikasi', icon: Settings },
];

export default function App() {
  const localTokenRef = useRef<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [school, setSchool] = useState<School | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('2026/2027');

  const [ptkList, setPtkList] = useState<Ptk[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [attendances, setAttendances] = useState<ExamAttendance[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const loadAllData = useCallback(async (yearOverride?: string) => {
    setDataLoading(true);
    setGlobalError(null);
    try {
      const boot = await apiFetch<{
        user: AppUser;
        school: School | null;
        academicYears: AcademicYear[];
        ptk: Ptk[];
      }>('/api/bootstrap');

      setCurrentUser(boot.user);
      setSchool(boot.school);
      setAcademicYears(boot.academicYears);
      setPtkList(boot.ptk);

      const activeYr =
        yearOverride ||
        boot.academicYears.find((y) => y.isActive)?.tahunPelajaran ||
        boot.school?.tahunPelajaran ||
        '2026/2027';
      setSelectedYear(activeYr);

      const qYear = encodeURIComponent(activeYr);
      const [stuRes, subjRes, paperRes, gradeRes, attRes, dashRes] = await Promise.all([
        apiFetch<{ students: Student[] }>(`/api/students?tahunPelajaran=${qYear}`),
        apiFetch<{ subjects: Subject[] }>(`/api/subjects?tahunPelajaran=${qYear}`),
        apiFetch<{ examPapers: ExamPaper[] }>(`/api/exam-papers?tahunPelajaran=${qYear}`),
        apiFetch<{ gradingResults: GradingResult[] }>(`/api/grading?tahunPelajaran=${qYear}`),
        apiFetch<{ attendances: ExamAttendance[] }>(`/api/attendance?tahunPelajaran=${qYear}`),
        apiFetch<DashboardData>(`/api/dashboard?tahunPelajaran=${qYear}`),
      ]);

      setStudents(stuRes.students);
      setSubjects(subjRes.subjects);
      setExamPapers(paperRes.examPapers);
      setGradingResults(gradeRes.gradingResults);
      setAttendances(attRes.attendances);
      setDashboardData(dashRes);
    } catch (err: any) {
      setGlobalError(err.message || 'Gagal memuat data aplikasi.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  const refreshYearData = useCallback(async (year: string) => {
    setDataLoading(true);
    try {
      const qYear = encodeURIComponent(year);
      const [stuRes, subjRes, paperRes, gradeRes, attRes, dashRes] = await Promise.all([
        apiFetch<{ students: Student[] }>(`/api/students?tahunPelajaran=${qYear}`),
        apiFetch<{ subjects: Subject[] }>(`/api/subjects?tahunPelajaran=${qYear}`),
        apiFetch<{ examPapers: ExamPaper[] }>(`/api/exam-papers?tahunPelajaran=${qYear}`),
        apiFetch<{ gradingResults: GradingResult[] }>(`/api/grading?tahunPelajaran=${qYear}`),
        apiFetch<{ attendances: ExamAttendance[] }>(`/api/attendance?tahunPelajaran=${qYear}`),
        apiFetch<DashboardData>(`/api/dashboard?tahunPelajaran=${qYear}`),
      ]);
      setStudents(stuRes.students);
      setSubjects(subjRes.subjects);
      setExamPapers(paperRes.examPapers);
      setGradingResults(gradeRes.gradingResults);
      setAttendances(attRes.attendances);
      setDashboardData(dashRes);
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (localTokenRef.current) return localTokenRef.current;
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
      return null;
    });

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !localTokenRef.current) {
        await loadAllData();
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, [loadAllData]);

  const handleLoginLocal = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login gagal.');
      }
      localTokenRef.current = data.token;
      setCurrentUser(data.user);
      await loadAllData();
    } catch (err: any) {
      setAuthError(err.message || 'Gagal masuk dengan username dan password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginGoogle = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      localTokenRef.current = null;
      await signInWithPopup(auth, googleAuthProvider);
      await loadAllData();
    } catch (err: any) {
      setAuthError(err.message || 'Gagal masuk menggunakan akun Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    localTokenRef.current = null;
    if (auth.currentUser) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setDashboardData(null);
    setActiveNav('dashboard');
  };

  // ============================================================================
  // HANDLERS CONNECTED TO POSTGRESQL BACKEND
  // ============================================================================
  const handleSaveSchool = async (payload: Partial<School>) => {
    const res = await apiFetch<{ school: School }>('/api/school', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setSchool(res.school);
  };

  const handleAddAcademicYear = async (tahunPelajaran: string) => {
    const res = await apiFetch<{ academicYear: AcademicYear }>('/api/academic-years', {
      method: 'POST',
      body: JSON.stringify({ tahunPelajaran }),
    });
    setAcademicYears((prev) => [res.academicYear, ...prev]);
  };

  const handleActivateAcademicYear = async (id: number) => {
    const res = await apiFetch<{ academicYear: AcademicYear }>(
      `/api/academic-years/${id}/activate`,
      { method: 'PUT' }
    );
    setAcademicYears((prev) =>
      prev.map((y) => ({ ...y, isActive: y.id === res.academicYear.id }))
    );
    setSelectedYear(res.academicYear.tahunPelajaran);
    await loadAllData(res.academicYear.tahunPelajaran);
  };

  const handleCreatePtk = async (payload: Partial<Ptk>) => {
    const res = await apiFetch<{ ptk: Ptk }>('/api/ptk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setPtkList((prev) => [...prev, res.ptk]);
    refreshYearData(selectedYear);
  };

  const handleUpdatePtk = async (id: number, payload: Partial<Ptk>) => {
    const res = await apiFetch<{ ptk: Ptk }>(`/api/ptk/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setPtkList((prev) => prev.map((p) => (p.id === id ? res.ptk : p)));
  };

  const handleDeletePtk = async (id: number) => {
    await apiFetch(`/api/ptk/${id}`, { method: 'DELETE' });
    setPtkList((prev) => prev.filter((p) => p.id !== id));
    refreshYearData(selectedYear);
  };

  const handleCreateStudent = async (payload: Partial<Student>) => {
    const res = await apiFetch<{ student: Student }>('/api/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStudents((prev) => [...prev, res.student]);
    refreshYearData(selectedYear);
  };

  const handleBulkImportStudents = async (rows: Partial<Student>[]) => {
    const res = await apiFetch<{ importedCount: number; students: Student[] }>(
      '/api/students/bulk',
      {
        method: 'POST',
        body: JSON.stringify({ rows, tahunPelajaran: selectedYear }),
      }
    );
    await refreshYearData(selectedYear);
    return res.importedCount;
  };

  const handleUpdateStudent = async (id: number, payload: Partial<Student>) => {
    const res = await apiFetch<{ student: Student }>(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setStudents((prev) => prev.map((s) => (s.id === id ? res.student : s)));
  };

  const handleDeleteStudent = async (id: number) => {
    await apiFetch(`/api/students/${id}`, { method: 'DELETE' });
    setStudents((prev) => prev.filter((s) => s.id !== id));
    await refreshYearData(selectedYear);
  };

  const handleCreateSubject = async (payload: Partial<Subject>) => {
    const res = await apiFetch<{ subject: Subject }>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSubjects((prev) => [...prev, res.subject]);
    refreshYearData(selectedYear);
  };

  const handleUpdateSubject = async (id: number, payload: Partial<Subject>) => {
    const res = await apiFetch<{ subject: Subject }>(`/api/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setSubjects((prev) => prev.map((s) => (s.id === id ? res.subject : s)));
  };

  const handleDeleteSubject = async (id: number) => {
    await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    await refreshYearData(selectedYear);
  };

  const handleSaveExamPaper = async (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    subjectId: number;
    namaMataPelajaran: string;
    guruPengampu: string;
    jumlahSoal: number;
    tipePenilaian: string;
    questionsList: Question[];
  }) => {
    await apiFetch('/api/questions/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshYearData(selectedYear);
  };

  const handleDuplicateExamPaper = async (
    sourcePaperId: number,
    targetJenisUjian: string,
    targetTahunPelajaran: string
  ) => {
    await apiFetch('/api/exam-papers/duplicate', {
      method: 'POST',
      body: JSON.stringify({ sourcePaperId, targetJenisUjian, targetTahunPelajaran }),
    });
    await refreshYearData(selectedYear);
  };

  const handleDeleteExamPaper = async (id: number) => {
    await apiFetch(`/api/exam-papers/${id}`, { method: 'DELETE' });
    await refreshYearData(selectedYear);
  };

  const handleAutoGradeSingle = async (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    studentId: number;
    subjectId: number;
    jawabanSiswa: Record<string, string>;
    note?: string;
  }) => {
    const res = await apiFetch<{ result: GradingResult }>('/api/grading/auto-grade', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshYearData(selectedYear);
    return res.result;
  };

  const handleBatchGradeClass = async (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    subjectId: number;
    entries: Array<{ studentId: number; jawabanSiswa: Record<string, string> }>;
  }) => {
    const res = await apiFetch<{ results: GradingResult[] }>('/api/grading/batch-grade', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshYearData(selectedYear);
    return res.results;
  };

  const handleSaveAttendance = async (payload: {
    jenisUjian: string;
    tahunPelajaran: string;
    kelas: string;
    tanggalUjian: string;
    subjectId: number;
    items: Array<{ studentId: number; statusKehadiran: string }>;
  }) => {
    await apiFetch('/api/attendance/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await refreshYearData(selectedYear);
  };

  const handleLoadAdminData = async () => {
    try {
      const logsRes = await apiFetch<{ logs: ActivityLog[] }>('/api/activity-logs');
      setActivityLogs(logsRes.logs);
      if (currentUser?.role === 'Administrator') {
        const usersRes = await apiFetch<{ users: AppUser[] }>('/api/users');
        setUsersList(usersRes.users);
      }
    } catch (err: any) {
      setGlobalError(err.message);
    }
  };

  const handleCreateUser = async (payload: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    assignedClass: string;
  }) => {
    const res = await apiFetch<{ user: AppUser }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setUsersList((prev) => [...prev, res.user]);
  };

  const handleUpdateUser = async (id: number, payload: Partial<AppUser> & { password?: string }) => {
    const res = await apiFetch<{ user: AppUser }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setUsersList((prev) => prev.map((u) => (u.id === id ? res.user : u)));
  };

  const handleDeleteUser = async (id: number) => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    setUsersList((prev) => prev.filter((u) => u.id !== id));
  };

  const handleDownloadBackup = async () => {
    const snapshot = await apiFetch('/api/backup');
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Penilaian_Sekolah_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = async (jsonData: any) => {
    await apiFetch('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(jsonData),
    });
    await loadAllData();
  };

  if (!authReady && !currentUser) {
    return (
      <div className="min-h-screen bg-[#071832] flex items-center justify-center text-white text-sm">
        Memuat Sistem Penilaian Sekolah...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoginLocal={handleLoginLocal}
        onLoginGoogle={handleLoginGoogle}
        loading={authLoading}
        error={authError}
      />
    );
  }

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeNav) || NAV_ITEMS[0];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B2447] via-[#091E3C] to-[#06152B] text-white">
      {/* Brand Block */}
      <div className="p-5 flex flex-col items-center text-center border-b border-white/10">
        {school?.logoSekolah ? (
          <img
            src={school.logoSekolah}
            alt="Logo Sekolah"
            referrerPolicy="no-referrer"
            className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1 mb-2.5"
          />
        ) : (
          <SchoolCrest className="w-12 h-12 mb-2.5" />
        )}
        <h1 className="text-xs font-extrabold tracking-wide leading-snug text-white">
          APLIKASI KOREKSI SOAL DAN PENGOLAHAN NILAI SEKOLAH
        </h1>
        <div className="w-16 h-0.5 bg-[#D4A62A] my-2" />
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Sistem Informasi Penilaian Akhir Semester Ganjil, Genap &amp; Ujian Sekolah
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveNav(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left text-xs font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-[#D4A62A] to-[#EBC556] text-[#0B2447] shadow-sm'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0B2447]' : 'text-[#EBC556]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Motto */}
      <div className="p-4 border-t border-white/10 text-center">
        <p className="text-[11px] italic text-[#EBC556]">
          Pendidikan Berkualitas, Masa Depan Gemilang
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-68 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 h-full shadow-2xl relative z-10">
            <SidebarContent />
          </div>
          <div
            className="flex-1 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-white text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Mobile Menu Toggle + School Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                aria-label="Buka Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="text-base lg:text-lg font-extrabold text-[#0B2447] truncate">
                  {school?.namaSekolah || 'SD NEGERI WARAWAF'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {school
                    ? `${school.alamatSekolah}, ${school.desaKampung}, Kab. ${school.kabupaten}`
                    : 'Sistem Penilaian Sekolah Dasar'}
                </div>
              </div>
            </div>

            {/* Right: Academic Year Selector + User Profile + Logout */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                <Calendar className="w-4 h-4 text-[#0B2447]" />
                <span className="text-xs text-slate-500">Tahun Pelajaran:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const yr = e.target.value;
                    setSelectedYear(yr);
                    refreshYearData(yr);
                  }}
                  className="bg-transparent text-xs font-bold font-mono text-[#0B2447] focus:outline-none"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.tahunPelajaran}>
                      {y.tahunPelajaran}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[11px] font-medium text-[#B8891B]">{currentUser.role}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Keluar dari Aplikasi"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-bar Breadcrumb */}
        <div className="px-4 lg:px-6 pt-4 pb-1 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>Beranda</span>
            <span className="mx-1.5">/</span>
            <span className="font-semibold text-[#0B2447]">{activeNavMeta.label}</span>
          </div>
          <div className="font-mono tabular-nums">
            NPSN: {school?.npsn || '-'} · TA {selectedYear}
          </div>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mx-4 lg:mx-6 mt-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
            <span>{globalError}</span>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="text-xs font-semibold underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Active Module Viewport */}
        <main className="flex-1 p-4 lg:p-6">
          {activeNav === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              tahunPelajaran={selectedYear}
              loading={dataLoading}
              onRefresh={() => refreshYearData(selectedYear)}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'school' && (
            <SchoolDataView
              school={school}
              academicYears={academicYears}
              userRole={currentUser.role}
              onSaveSchool={handleSaveSchool}
              onAddAcademicYear={handleAddAcademicYear}
              onActivateAcademicYear={handleActivateAcademicYear}
            />
          )}

          {activeNav === 'ptk' && (
            <PtkView
              ptkList={ptkList}
              userRole={currentUser.role}
              onCreate={handleCreatePtk}
              onUpdate={handleUpdatePtk}
              onDelete={handleDeletePtk}
            />
          )}

          {activeNav === 'students' && (
            <StudentsView
              students={students}
              ptkList={ptkList}
              school={school}
              tahunPelajaran={selectedYear}
              userRole={currentUser.role}
              onCreate={handleCreateStudent}
              onBulkImport={handleBulkImportStudents}
              onUpdate={handleUpdateStudent}
              onDelete={handleDeleteStudent}
            />
          )}

          {activeNav === 'subjects' && (
            <SubjectsView
              subjects={subjects}
              ptkList={ptkList}
              tahunPelajaran={selectedYear}
              userRole={currentUser.role}
              onCreate={handleCreateSubject}
              onUpdate={handleUpdateSubject}
              onDelete={handleDeleteSubject}
            />
          )}

          {activeNav === 'questions' && (
            <QuestionsView
              subjects={subjects}
              examPapers={examPapers}
              tahunPelajaran={selectedYear}
              userRole={currentUser.role}
              onSavePaper={handleSaveExamPaper}
              onDuplicatePaper={handleDuplicateExamPaper}
              onDeletePaper={handleDeleteExamPaper}
            />
          )}

          {activeNav === 'grading' && (
            <AutoGradingView
              students={students}
              subjects={subjects}
              examPapers={examPapers}
              gradingResults={gradingResults}
              tahunPelajaran={selectedYear}
              userRole={currentUser.role}
              onAutoGradeSingle={handleAutoGradeSingle}
              onBatchGradeClass={handleBatchGradeClass}
            />
          )}

          {activeNav === 'attendance' && (
            <AttendanceView
              students={students}
              subjects={subjects}
              ptkList={ptkList}
              school={school}
              attendances={attendances}
              tahunPelajaran={selectedYear}
              userRole={currentUser.role}
              onSaveAttendance={handleSaveAttendance}
            />
          )}

          {activeNav === 'grades' && (
            <GradesListView
              students={students}
              subjects={subjects}
              gradingResults={gradingResults}
              ptkList={ptkList}
              school={school}
              tahunPelajaran={selectedYear}
            />
          )}

          {activeNav === 'recap' && (
            <RecapView
              students={students}
              subjects={subjects}
              gradingResults={gradingResults}
              ptkList={ptkList}
              school={school}
              tahunPelajaran={selectedYear}
            />
          )}

          {activeNav === 'learning-report' && (
            <LearningReportView
              school={school}
              ptkList={ptkList}
              students={students}
              subjects={subjects}
              gradingResults={gradingResults}
              attendances={attendances}
              tahunPelajaran={selectedYear}
            />
          )}

          {activeNav === 'pdf' && (
            <PdfCenterView
              school={school}
              ptkList={ptkList}
              students={students}
              subjects={subjects}
              gradingResults={gradingResults}
              attendances={attendances}
              tahunPelajaran={selectedYear}
            />
          )}

          {activeNav === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              usersList={usersList}
              activityLogs={activityLogs}
              onLoadAdminData={handleLoadAdminData}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onDownloadBackup={handleDownloadBackup}
              onRestoreBackup={handleRestoreBackup}
            />
          )}
        </main>
      </div>
    </div>
  );
}
