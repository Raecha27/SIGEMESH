import { db } from './storage';
import { Jadwal, Guru, MataPelajaran, Kelas, Profile } from '../types';

export interface JoinedJadwal {
  id: string;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
  mapelId: string;
  kelasId: string;
  guruId: string;
  mapel: MataPelajaran | null;
  kelas: Kelas | null;
  guru: Guru | null;
}

export type ScheduleStatus = 'Belum Dimulai' | 'Sedang Berlangsung' | 'Selesai';

/**
 * Calculate status automatically based on current time
 */
export function getScheduleStatus(
  jamMulai: string,
  jamSelesai: string,
  nowDate: Date = new Date()
): ScheduleStatus {
  if (!jamMulai || !jamSelesai) return 'Belum Dimulai';

  const parseMinutes = (timeStr: string) => {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h * 60 + m;
  };

  const startMins = parseMinutes(jamMulai);
  const endMins = parseMinutes(jamSelesai);
  const currentMins = nowDate.getHours() * 60 + nowDate.getMinutes();

  if (currentMins < startMins) {
    return 'Belum Dimulai';
  } else if (currentMins >= startMins && currentMins <= endMins) {
    return 'Sedang Berlangsung';
  } else {
    return 'Selesai';
  }
}

/**
 * Get Indonesian Day Name from Date object
 */
export function getIndonesianDayName(date: Date = new Date()): Jadwal['hari'] {
  const dayIndex = date.getDay(); // 0 = Minggu, 1 = Senin, ...
  const map: Record<number, Jadwal['hari']> = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
    0: 'Senin' // Default fallback for Sunday to Monday
  };
  return map[dayIndex] || 'Senin';
}

/**
 * Fetch and join schedule data with Supabase / Storage fallback and RBAC / RLS filtering.
 */
export async function fetchTodaySchedules(
  dayName?: Jadwal['hari'],
  customUserId?: string
): Promise<{ data: JoinedJadwal[]; isGuru: boolean; matchedGuru: Guru | null; error: Error | null }> {
  try {
    // 1. Resolve current user and role
    const currentUser: Profile = customUserId
      ? db.getProfiles().find(p => p.id === customUserId) || db.getCurrentUser()
      : db.getCurrentUser();

    const roles = db.getRoles();
    const currentRole = roles.find(r => r.id === currentUser.roleId);

    // RBAC Check: Is user Admin / Has Full Access?
    const isAdmin =
      currentUser.roleId === 'role-admin' ||
      (currentRole?.name && currentRole.name.toLowerCase().includes('admin')) ||
      db.hasPermission('jadwal.create');

    const gurus = db.getGurus().filter(g => g.status === 'active');
    const mapelList = db.getMapels();
    const kelasList = db.getKelas();
    const rawJadwals = db.getJadwals();

    // Find corresponding Guru profile for logged in user (if teacher)
    let matchedGuru: Guru | null = null;
    if (!isAdmin) {
      matchedGuru =
        gurus.find(
          g =>
            g.id === currentUser.id ||
            (currentUser.nip && g.nip === currentUser.nip) ||
            (currentUser.email && g.email === currentUser.email) ||
            (currentUser.name && g.nama.toLowerCase().includes(currentUser.name.toLowerCase()))
        ) ||
        gurus.find(g => g.roleId === currentUser.roleId) ||
        gurus[0] ||
        null;
    }

    // Target day
    const targetDay = dayName || getIndonesianDayName();

    // Join relations: jadwal -> mapel -> kelas -> guru
    let joinedList: JoinedJadwal[] = rawJadwals.map(j => {
      const mapel = mapelList.find(m => m.id === j.mapelId) || null;
      const kelas = kelasList.find(k => k.id === j.kelasId) || null;
      const resolvedGuruId = (j as any).guruId || mapel?.guruId || '';
      const guru = gurus.find(g => g.id === resolvedGuruId) || null;

      return {
        id: j.id,
        hari: j.hari,
        jamMulai: j.jamMulai,
        jamSelesai: j.jamSelesai,
        ruangan: j.ruangan,
        mapelId: j.mapelId,
        kelasId: j.kelasId,
        guruId: resolvedGuruId,
        mapel,
        kelas,
        guru
      };
    });

    // 2. Filter by Day
    joinedList = joinedList.filter(j => j.hari === targetDay);

    // 3. Apply RLS / RBAC filtering
    // Role Guru: ONLY see schedules matching matchedGuru.id
    if (!isAdmin && matchedGuru) {
      joinedList = joinedList.filter(
        j => j.guruId === matchedGuru?.id || j.mapel?.guruId === matchedGuru?.id
      );
    }

    // 4. Sort by jamMulai ascending
    joinedList.sort((a, b) => {
      const parseMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      return parseMins(a.jamMulai) - parseMins(b.jamMulai);
    });

    return {
      data: joinedList,
      isGuru: !isAdmin,
      matchedGuru,
      error: null
    };
  } catch (err: any) {
    return {
      data: [],
      isGuru: false,
      matchedGuru: null,
      error: err instanceof Error ? err : new Error('Gagal mengambil data jadwal')
    };
  }
}
