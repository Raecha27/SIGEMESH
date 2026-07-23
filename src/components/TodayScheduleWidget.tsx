import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  School,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ClipboardList,
  UserCheck,
  CalendarX,
  Shield
} from 'lucide-react';
import {
  fetchTodaySchedules,
  getScheduleStatus,
  getIndonesianDayName,
  JoinedJadwal,
  ScheduleStatus
} from '../utils/supabaseSchedule';
import { db } from '../utils/storage';
import { Jadwal } from '../types';

interface TodayScheduleWidgetProps {
  onNavigate?: (tab: string) => void;
  onRefreshStats?: () => void;
}

export default function TodayScheduleWidget({
  onNavigate,
  onRefreshStats
}: TodayScheduleWidgetProps) {
  const todayName = getIndonesianDayName();

  // Selected Day state (defaults to today)
  const [selectedDay, setSelectedDay] = useState<Jadwal['hari']>(todayName);

  // Live Time Clock for status recalculation
  const [nowDate, setNowDate] = useState<Date>(new Date());

  // Data states
  const [schedules, setSchedules] = useState<JoinedJadwal[]>([]);
  const [isGuru, setIsGuru] = useState<boolean>(false);
  const [matchedGuruName, setMatchedGuruName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Days list
  const daysList: Jadwal['hari'][] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Current user & profiles for reactivity
  const currentUserId = db.getCurrentUserId();

  // Load schedule data
  const loadSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTodaySchedules(selectedDay, currentUserId);
      if (res.error) {
        setError(res.error.message);
      } else {
        setSchedules(res.data);
        setIsGuru(res.isGuru);
        if (res.matchedGuru) {
          setMatchedGuruName(res.matchedGuru.nama);
        } else {
          setMatchedGuruName('');
        }
      }
    } catch (err: any) {
      setError('Terjadi kesalahan saat memuat data jadwal.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and reload on day / user change
  useEffect(() => {
    loadSchedules();
  }, [selectedDay, currentUserId]);

  // Maintain live ticker for real-time status updates (every 10 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Format current date display
  const formattedDate = nowDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = nowDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Render Status Badge
  const renderStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case 'Sedang Berlangsung':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sedang Berlangsung
          </span>
        );
      case 'Belum Dimulai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Belum Dimulai
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Selesai
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0 transition-all">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-400/30">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                {isGuru ? 'Jadwal Mengajar Hari Ini' : 'Seluruh Jadwal Mengajar Hari Ini'}
                <span className="text-[10px] uppercase font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                  {isGuru ? 'Role: Guru' : 'Role: Admin / Manajemen'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {isGuru ? (
                  <>
                    Jadwal KBM pribadi Bapak/Ibu{' '}
                    <span className="text-amber-300 font-bold">{matchedGuruName || 'Guru'}</span>
                  </>
                ) : (
                  'Monitoring seluruh agenda mengajar guru di seluruh rombongan belajar'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Live Clock & Day indicator */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2 font-mono text-slate-200">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span>{formattedDate}</span>
            <span className="text-blue-400 font-bold">• {formattedTime} WIB</span>
          </div>

          <button
            onClick={loadSchedules}
            disabled={loading}
            title="Refresh Data Jadwal"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Day Selector Navigation Pills */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Hari:
          </span>
          {daysList.map(d => {
            const isToday = d === todayName;
            const isSelected = d === selectedDay;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200'
                }`}
              >
                <span>{d}</span>
                {isToday && (
                  <span
                    className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded uppercase ${
                      isSelected ? 'bg-blue-800 text-blue-100' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Hari Ini
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs font-bold text-slate-600 font-mono">
          Total: <span className="text-blue-600 font-extrabold">{schedules.length} Jadwal</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5">
        {/* Error Toast Notification State */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadSchedules}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="animate-pulse bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-28"></div>
              </div>
            ))}
          </div>
        ) : schedules.length > 0 ? (
          /* List of Schedules */
          <div className="space-y-3">
            {schedules.map(item => {
              const status = getScheduleStatus(item.jamMulai, item.jamSelesai, nowDate);
              const isCurrentSession = status === 'Sedang Berlangsung';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCurrentSession
                      ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-400/20 shadow-sm'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Left Column: Time & Status */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`p-3 rounded-xl flex flex-col items-center justify-center min-w-[100px] border font-mono ${
                        isCurrentSession
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.jamMulai}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">-</span>
                      <span className="text-xs font-bold">{item.jamSelesai}</span>
                      <span className="text-[9px] uppercase mt-0.5 opacity-80">WIB</span>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderStatusBadge(status)}
                        {item.mapel && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                            {item.mapel.kode}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        {item.mapel?.nama || 'Mata Pelajaran'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                        {/* Kelas */}
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <School className="h-3.5 w-3.5 text-purple-600" />
                          <span>{item.kelas?.nama || 'Kelas'}</span>
                        </div>

                        {/* Ruangan */}
                        <div className="flex items-center gap-1 text-slate-500 font-mono">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          <span>{item.ruangan}</span>
                        </div>

                        {/* Guru Name (Displayed prominently for Admin or always) */}
                        {(!isGuru || !matchedGuruName) && item.guru && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200/80">
                            <User className="h-3.5 w-3.5 text-amber-600" />
                            <span>{item.guru.nama}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Quick Actions */}
                  <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    {onNavigate && (
                      <>
                        <button
                          onClick={() => onNavigate('absensi')}
                          className="flex-1 md:flex-none px-3 py-1.5 border border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                          Presensi
                        </button>
                        <button
                          onClick={() => onNavigate('jurnal')}
                          className="flex-1 md:flex-none px-3 py-1.5 border border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                          Jurnal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="py-10 px-4 text-center bg-slate-50 border-2 border-dashed border-slate-200/80 rounded-2xl max-w-xl mx-auto my-2 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
              <CalendarX className="h-6 w-6 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800">
                Tidak ada jadwal mengajar hari ini.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {isGuru
                  ? `Bapak/Ibu ${matchedGuruName || 'Guru'}, Anda tidak memiliki agenda jam mengajar di kelas pada hari ${selectedDay}.`
                  : `Belum ada jadwal kegiatan belajar mengajar yang terdaftar pada hari ${selectedDay} di seluruh rombongan belajar.`}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('jadwal')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Lihat Kalender Penjadwalan <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
