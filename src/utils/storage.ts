import {
  Permission,
  Role,
  Profile,
  Guru,
  Kelas,
  Siswa,
  MataPelajaran,
  Jadwal,
  Absensi,
  AbsensiDetail,
  Materi,
  Jurnal,
  Nilai,
  PengaturanSekolah,
  ActivityLog
} from '../types';
import { supabase } from './supabase';

import {
  initialSchoolSettings,
  initialRoles,
  initialProfiles,
  initialGurus,
  initialKelas,
  initialMataPelajarans,
  initialSiswas,
  initialJadwals,
  initialAbsensis,
  initialAbsensiDetails,
  initialMateris,
  initialJurnals,
  initialNilais,
  initialLogs
} from './initialData';

// Storage keys
const KEYS = {
  SETTINGS: 'ta_school_settings',
  ROLES: 'ta_roles',
  PROFILES: 'ta_profiles',
  GURUS: 'ta_gurus',
  KELAS: 'ta_kelas',
  MAPELS: 'ta_mapels',
  SISWAS: 'ta_siswas',
  JADWALS: 'ta_jadwals',
  ABSENSIS: 'ta_absensis',
  ABSENSI_DETAILS: 'ta_absensi_details',
  MATERIS: 'ta_materis',
  JURNALS: 'ta_jurnals',
  NILAIS: 'ta_nilais',
  LOGS: 'ta_logs',
  CURRENT_USER_ID: 'ta_current_user_id'
};

// Generic helper to get or initialize localStorage
function getStored<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Main DB Store object
export const db = {
  getSettings: () => getStored<PengaturanSekolah>(KEYS.SETTINGS, initialSchoolSettings),
  setSettings: (settings: PengaturanSekolah) => setStored(KEYS.SETTINGS, settings),

  getRoles: () => {
    // Return stored roles merged with initialRoles to ensure permissions stay up to date
    const stored = getStored<Role[]>(KEYS.ROLES, initialRoles);
    return stored.map(sRole => {
      const init = initialRoles.find(r => r.id === sRole.id);
      return init ? { ...sRole, permissions: init.permissions } : sRole;
    });
  },
  setRoles: (roles: Role[]) => setStored(KEYS.ROLES, roles),

  getProfiles: () => getStored<Profile[]>(KEYS.PROFILES, initialProfiles),
  setProfiles: (profiles: Profile[]) => setStored(KEYS.PROFILES, profiles),

  getGurus: () => getStored<Guru[]>(KEYS.GURUS, initialGurus),
  setGurus: (gurus: Guru[]) => setStored(KEYS.GURUS, gurus),

  getKelas: () => getStored<Kelas[]>(KEYS.KELAS, initialKelas),
  setKelas: (kelas: Kelas[]) => setStored(KEYS.KELAS, kelas),

  getMapels: () => getStored<MataPelajaran[]>(KEYS.MAPELS, initialMataPelajarans),
  setMapels: (mapels: MataPelajaran[]) => setStored(KEYS.MAPELS, mapels),

  getSiswas: () => getStored<Siswa[]>(KEYS.SISWAS, initialSiswas),
  setSiswas: (siswas: Siswa[]) => setStored(KEYS.SISWAS, siswas),

  getJadwals: () => getStored<Jadwal[]>(KEYS.JADWALS, initialJadwals),
  setJadwals: (jadwals: Jadwal[]) => setStored(KEYS.JADWALS, jadwals),

  getAbsensis: () => getStored<Absensi[]>(KEYS.ABSENSIS, initialAbsensis),
  setAbsensis: (absensis: Absensi[]) => setStored(KEYS.ABSENSIS, absensis),

  getAbsensiDetails: () => getStored<AbsensiDetail[]>(KEYS.ABSENSI_DETAILS, initialAbsensiDetails),
  setAbsensiDetails: (details: AbsensiDetail[]) => setStored(KEYS.ABSENSI_DETAILS, details),

  getMateris: () => getStored<Materi[]>(KEYS.MATERIS, initialMateris),
  setMateris: (materis: Materi[]) => setStored(KEYS.MATERIS, materis),

  getJurnals: () => getStored<Jurnal[]>(KEYS.JURNALS, initialJurnals),
  setJurnals: (jurnals: Jurnal[]) => setStored(KEYS.JURNALS, jurnals),

  getNilais: () => getStored<Nilai[]>(KEYS.NILAIS, initialNilais),
  setNilais: (nilais: Nilai[]) => setStored(KEYS.NILAIS, nilais),

  getLogs: () => getStored<ActivityLog[]>(KEYS.LOGS, initialLogs),
  setLogs: (logs: ActivityLog[]) => setStored(KEYS.LOGS, logs),
  clearLogs: () => setStored(KEYS.LOGS, []),

  getCurrentUserId: () => getStored<string>(KEYS.CURRENT_USER_ID, 'u-admin'),
  setCurrentUserId: (id: string) => setStored(KEYS.CURRENT_USER_ID, id),
  isLoggedIn: () => getStored<boolean>('ta_is_logged_in', true),
  login: (id: string) => {
    setStored(KEYS.CURRENT_USER_ID, id);
    setStored('ta_is_logged_in', true);
  },
  logout: () => {
    try {
      db.logActivity("Logout", "Pengguna berhasil keluar dari aplikasi.");
    } catch (e) {
      // Ignore if log error
    }
    setStored('ta_is_logged_in', false);
    sessionStorage.clear();
    supabase.auth.signOut().catch(() => {});
  },

  // Log action helper
  logActivity: (aktivitas: string, detail: string) => {
    const userId = db.getCurrentUserId();
    const profiles = db.getProfiles();
    const user = profiles.find(p => p.id === userId) || { name: 'Sistem', roleId: 'role-admin' };
    const roles = db.getRoles();
    const roleName = roles.find(r => r.id === user.roleId)?.name || 'Pengguna';

    const logs = db.getLogs();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      userName: user.name,
      userRole: roleName,
      aktivitas,
      detail,
      timestamp: new Date().toISOString()
    };
    db.setLogs([newLog, ...logs]);
  },

  // RBAC permission check helper
  hasPermission: (permission: Permission): boolean => {
    const userId = db.getCurrentUserId();
    const profiles = db.getProfiles();
    const user = profiles.find(p => p.id === userId);
    if (!user || user.status !== 'active') return false;

    const roles = db.getRoles();
    const role = roles.find(r => r.id === user.roleId);
    if (!role) return false;

    return role.permissions.includes(permission);
  },

  getCurrentUser: (): Profile => {
    const userId = db.getCurrentUserId();
    const profiles = db.getProfiles();
    return profiles.find(p => p.id === userId) || profiles[0];
  },

  // Helper to check if current (or target) user is a Wali Kelas (Homeroom Teacher)
  isWaliKelas: (userId?: string): boolean => {
    const targetUserId = userId || db.getCurrentUserId();
    const profiles = db.getProfiles();
    const user = profiles.find(p => p.id === targetUserId);
    if (!user) return false;

    const roles = db.getRoles();
    const currentRole = roles.find(r => r.id === user.roleId);

    return (
      user.roleId === 'role-walikelas' ||
      Boolean(currentRole?.name && currentRole.name.toLowerCase().includes('wali kelas'))
    );
  },

  // Helper to resolve the homeroom class (Kelas Perwalian) for current (or target) user
  getHomeroomClass: (userId?: string): Kelas | null => {
    const targetUserId = userId || db.getCurrentUserId();
    const profiles = db.getProfiles();
    const user = profiles.find(p => p.id === targetUserId);
    if (!user) return null;

    const gurus = db.getGurus();
    // Match guru by ID, NIP, or Email
    const matchedGuru =
      gurus.find(
        g =>
          g.id === user.id ||
          (user.nip && g.nip === user.nip) ||
          (user.email && g.email === user.email) ||
          (user.name && g.nama.toLowerCase().includes(user.name.toLowerCase()))
      ) ||
      gurus.find(g => g.roleId === user.roleId);

    const kelasList = db.getKelas();
    if (matchedGuru) {
      const homeroom = kelasList.find(k => k.waliKelasId === matchedGuru.id);
      if (homeroom) return homeroom;
    }

    // Fallback if user is Wali Kelas role: assign first class or default perwalian class
    if (db.isWaliKelas(targetUserId)) {
      // e.g. "Kelas XII IPA 1" (k-xii-ipa1) which is Pak Bambang's perwalian class
      const defaultHomeroom = kelasList.find(k => k.id === 'k-xii-ipa1') || kelasList[0];
      return defaultHomeroom || null;
    }

    return null;
  },

  // Helper to check if user has Role Guru / Pengajar
  isGuru: (userId?: string): boolean => {
    const targetUserId = userId || db.getCurrentUserId();
    const profiles = db.getProfiles();
    const user = profiles.find(p => p.id === targetUserId);
    if (!user) return false;

    const roles = db.getRoles();
    const currentRole = roles.find(r => r.id === user.roleId);

    return (
      user.roleId === 'role-guru' ||
      Boolean(
        currentRole?.name &&
        currentRole.name.toLowerCase().includes('guru') &&
        !currentRole.name.toLowerCase().includes('admin') &&
        !currentRole.name.toLowerCase().includes('wali')
      )
    );
  },

  // Resolve Teacher (Guru) record corresponding to current or target user
  getTeacherProfile: (userId?: string): Guru | null => {
    const targetUserId = userId || db.getCurrentUserId();
    const profiles = db.getProfiles();
    const user = profiles.find(p => p.id === targetUserId);
    if (!user) return null;

    const gurus = db.getGurus();
    // Match guru by ID, NIP, Email, or Name substring
    const matchedGuru = gurus.find(
      g =>
        g.id === user.id ||
        (user.nip && g.nip === user.nip) ||
        (user.email && g.email === user.email) ||
        (user.name && g.nama.toLowerCase().includes(user.name.toLowerCase()))
    );

    if (matchedGuru) return matchedGuru;

    // Fallback if role is role-guru
    if (user.roleId === 'role-guru') {
      return gurus.find(g => g.roleId === 'role-guru' || g.id === 'g-siti') || gurus[0];
    }

    return null;
  },

  // Resolve MataPelajaran taught by teacher (by guruId or via Jadwal)
  getTeacherMapels: (userId?: string): MataPelajaran[] => {
    const mapels = db.getMapels();
    if (!db.isGuru(userId)) return mapels;

    const teacher = db.getTeacherProfile(userId);
    if (!teacher) return mapels;

    const jadwals = db.getJadwals();
    const mapelIdsInJadwal = new Set(
      jadwals.filter(j => j.mapelId).map(j => j.mapelId)
    );

    const teacherMapels = mapels.filter(
      m => m.guruId === teacher.id
    );

    // Also include subjects matching teacher's main subject (mapelUtama)
    if (teacher.mapelUtama) {
      mapels.forEach(m => {
        if (m.nama.toLowerCase().includes(teacher.mapelUtama.toLowerCase()) && !teacherMapels.some(tm => tm.id === m.id)) {
          teacherMapels.push(m);
        }
      });
    }

    if (teacherMapels.length === 0 && mapels.length > 0) {
      return [mapels[1] || mapels[0]]; // fallback e.g. Fisika
    }

    return teacherMapels;
  },

  // Resolve Classes (Kelas) taught by teacher (via Jadwal or MataPelajaran)
  getTeacherClasses: (userId?: string): Kelas[] => {
    const kelasList = db.getKelas();
    if (!db.isGuru(userId)) return kelasList;

    const teacher = db.getTeacherProfile(userId);
    if (!teacher) return kelasList;

    const teacherMapels = db.getTeacherMapels(userId);
    const teacherMapelIds = new Set(teacherMapels.map(m => m.id));
    const jadwals = db.getJadwals();

    // Classes where teacher has a schedule entry
    const classIdsInJadwal = jadwals
      .filter(j => teacherMapelIds.has(j.mapelId))
      .map(j => j.kelasId);

    // Class where teacher is wali kelas
    const homeroom = kelasList.find(k => k.waliKelasId === teacher.id);

    const teacherClassIds = new Set([
      ...classIdsInJadwal,
      ...(homeroom ? [homeroom.id] : [])
    ]);

    const result = kelasList.filter(k => teacherClassIds.has(k.id));

    if (result.length === 0 && kelasList.length > 0) {
      return kelasList.slice(0, 2); // default fallback for demo
    }

    return result;
  },

  // Resolve Jadwal for current teacher
  getTeacherJadwals: (userId?: string): Jadwal[] => {
    const jadwals = db.getJadwals();
    if (!db.isGuru(userId)) return jadwals;

    const teacherMapels = db.getTeacherMapels(userId);
    const teacherMapelIds = new Set(teacherMapels.map(m => m.id));

    return jadwals.filter(j => teacherMapelIds.has(j.mapelId));
  }
};
