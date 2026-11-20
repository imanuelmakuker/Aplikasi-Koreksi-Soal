import React, { useState } from 'react';
import { Lock, LogIn, ShieldCheck, User as UserIcon } from 'lucide-react';
import { SchoolCrest } from './SchoolCrest.tsx';

interface LoginViewProps {
  onLoginLocal: (username: string, password: string) => Promise<void>;
  onLoginGoogle: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ROLE_PRESETS = [
  { label: 'Administrator', username: 'admin', pass: 'admin123', desc: 'Akses penuh seluruh sistem' },
  { label: 'Kepala Sekolah', username: 'kepsek', pass: 'kepsek123', desc: 'Laporan & rekapitulasi nilai' },
  { label: 'Guru Mapel', username: 'guru', pass: 'guru123', desc: 'Input soal, kunci & koreksi' },
  { label: 'Wali Kelas', username: 'walikelas', pass: 'wali123', desc: 'Nilai, absensi & rapor kelas' },
];

export function LoginView({ onLoginLocal, onLoginGoogle, loading, error }: LoginViewProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLoginLocal(username, password);
  };

  return (
    <div className="min-h-screen bg-[#071832] flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/20">
        {/* Left Brand Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0B2447] via-[#0F2F5C] to-[#071832] text-white p-8 lg:p-10 flex flex-col justify-between relative">
          <div className="space-y-6">
            <div className="flex items-center gap-3.5">
              <SchoolCrest className="w-12 h-12 shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#EBC556]">
                  SISTEM INFORMASI PENILAIAN SEKOLAH
                </p>
                <p className="text-sm font-medium text-slate-200">Sekolah Dasar (SD)</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-[#D4A62A] via-[#D4A62A]/40 to-transparent" />

            <div className="space-y-3">
              <h1 className="text-2xl lg:text-3xl font-bold leading-tight text-balance">
                Aplikasi Koreksi Soal &amp; Pengolahan Nilai Sekolah
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Pengelolaan terpadu untuk Penilaian Akhir Semester Ganjil, Semester Genap, dan Ujian
                Sekolah dengan koreksi pilihan ganda otomatis, absensi peserta, serta ekspor dokumen A4
                resmi siap cetak.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-[#EBC556] font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Hak Akses Berbasis Peran &amp; Penyimpanan Database Relasional</span>
            </div>
            <p className="text-slate-400">
              Mendukung Administrator, Kepala Sekolah, Guru Mata Pelajaran, dan Wali Kelas secara
              terstruktur.
            </p>
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="lg:col-span-7 p-8 lg:p-10 bg-white flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#0B2447]">Masuk ke Sistem</h2>
              <p className="text-sm text-slate-500 mt-1">
                Gunakan akun Google atau kredensial username &amp; password sekolah Anda.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={onLoginGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              Masuk dengan Akun Google
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-xs text-slate-400">
                atau masuk dengan username sekolah
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Masukkan username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2447]/20 focus:border-[#0B2447]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2447]/20 focus:border-[#0B2447]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B2447] hover:bg-[#113260] text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Memproses...' : 'Masuk ke Aplikasi'}
              </button>
            </form>

            {/* Quick Role Selector for School Staff Credentials */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-2.5">
                Pilih akun peran bawaan untuk mengisi kredensial:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.username}
                    type="button"
                    onClick={() => {
                      setUsername(preset.username);
                      setPassword(preset.pass);
                    }}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      username === preset.username
                        ? 'border-[#D4A62A] bg-amber-50/70'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-[#0B2447]">{preset.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
