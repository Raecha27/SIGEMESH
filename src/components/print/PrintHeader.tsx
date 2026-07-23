import React from 'react';
import { db } from '../../utils/storage';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  metadata?: { label: string; value: string }[];
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, metadata }) => {
  const settings = db.getSettings();

  return (
    <div className="w-full text-slate-900 mb-6 font-sans">
      {/* Official Kop Surat Header */}
      <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-3 mb-1">
        {settings.logo && (
          <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
            <img src={settings.logo} alt="Logo Sekolah" className="max-h-20 max-w-20 object-contain" />
          </div>
        )}
        <div className="flex-1 text-center space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            PEMERINTAH PROVINSI DKI JAKARTA
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            DINAS PENDIDIKAN DAN KEBUDAYAAN
          </p>
          <h1 className="text-base font-black uppercase text-slate-900 tracking-wide">
            {settings.namaSekolah || 'SMK NEGERI 1 JAKARTA'}
          </h1>
          <p className="text-[9.5px] font-medium text-slate-600 leading-tight">
            {settings.alamat} {settings.kecamatan ? `, Kec. ${settings.kecamatan}` : ''} {settings.kabupatenKota ? `, ${settings.kabupatenKota}` : ''} {settings.kodePos ? ` ${settings.kodePos}` : ''}
          </p>
          <p className="text-[9px] text-slate-500">
            {settings.telepon ? `Telp: ${settings.telepon}` : ''} {settings.email ? ` | Email: ${settings.email}` : ''} {settings.website ? ` | Web: ${settings.website}` : ''}
          </p>
        </div>
      </div>

      {/* Double line separator below Kop Surat */}
      <div className="border-b border-slate-900 mb-4"></div>

      {/* Report Title */}
      <div className="text-center space-y-1 mb-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 underline underline-offset-4 decoration-slate-400">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs font-semibold text-slate-600">
            {subtitle}
          </p>
        )}
      </div>

      {/* Metadata Key-Value Grid if provided */}
      {metadata && metadata.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-4 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
          {metadata.map((item, idx) => (
            <div key={idx} className="flex gap-1.5">
              <span className="font-semibold text-slate-500">{item.label}:</span>
              <span className="font-bold text-slate-800">{item.value || '-'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
