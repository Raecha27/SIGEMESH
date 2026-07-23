import React from 'react';
import { db } from '../../utils/storage';

interface PrintFooterProps {
  guruNama?: string;
  guruNip?: string;
  showKepalaSekolah?: boolean;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({
  guruNama,
  guruNip,
  showKepalaSekolah = false
}) => {
  const settings = db.getSettings();
  const currentUser = db.getCurrentUser();

  const activeGuruNama = guruNama || currentUser?.name || settings.kepalaSekolah || 'Guru Pembimbing';
  const activeGuruNip = guruNip || currentUser?.nip || '........................';

  const today = new Date();
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const formattedDate = `Jakarta, ${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div className="w-full text-slate-900 mt-8 pt-4 font-sans border-t border-slate-200">
      <div className="flex justify-between items-start text-xs leading-relaxed">
        {/* Kepala Sekolah Signature Block (if requested) */}
        {showKepalaSekolah ? (
          <div className="text-center w-56 space-y-1">
            <p className="invisible">Tanggal</p>
            <p className="font-semibold text-slate-700">Mengetahui,</p>
            <p className="font-bold text-slate-900">Kepala Sekolah</p>
            <div className="h-16"></div>
            <p className="font-extrabold text-slate-900 underline">{settings.kepalaSekolah}</p>
            <p className="text-[10px] text-slate-600 font-mono">NIP. {settings.nipKepalaSekolah || '........................'}</p>
          </div>
        ) : (
          <div className="text-left text-[10px] text-slate-400 self-end font-mono">
            Dicetak otomatis oleh Teacher Assistant System<br />
            {new Date().toLocaleString('id-ID')}
          </div>
        )}

        {/* Guru / Teacher Signature Block */}
        <div className="text-center w-56 space-y-1">
          <p className="text-slate-600 font-medium">{formattedDate}</p>
          <p className="font-semibold text-slate-700">Guru Mata Pelajaran,</p>
          <div className="h-16"></div>
          <p className="font-extrabold text-slate-900 underline">{activeGuruNama}</p>
          <p className="text-[10px] text-slate-600 font-mono">NIP. {activeGuruNip}</p>
        </div>
      </div>
    </div>
  );
};
