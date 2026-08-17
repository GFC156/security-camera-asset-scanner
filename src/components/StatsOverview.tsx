import React from 'react';
import { CameraAsset, ScanProgress } from '../types';
import { countEnabled } from '../utils/platformUtils';

interface StatsOverviewProps {
  assets: CameraAsset[];
  progress: ScanProgress;
  selectedProtocolFilter: string;
  onSelectFilter: (protocol: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  assets,
  progress,
  selectedProtocolFilter,
  onSelectFilter,
}) => {
  const total = assets.length;
  const { gb, eh, ez } = countEnabled(assets);

  const chips = [
    { id: 'all', label: '全部', count: total },
    { id: 'gb28181', label: 'GB28181', count: gb },
    { id: 'ehome', label: 'EHome', count: eh },
    { id: 'ezviz', label: '萤石云', count: ez },
  ];

  return (
    <div className="bg-[#DCDAD7] border-b border-[#999] flex items-center gap-2 px-4 py-1.5 text-[11px] font-mono-tech">
      <span className="text-[#666] uppercase tracking-[0.1em]">协议:</span>
      {chips.map((c) => {
        const active = selectedProtocolFilter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectFilter(c.id)}
            className={`px-2 py-0.5 border text-[11px] font-bold transition-all ${
              active
                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                : 'bg-transparent text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            {c.label} {c.count}
          </button>
        );
      })}
      <div className="ml-auto text-[#666]">
        {progress.isScanning && progress.currentIp
          ? `扫描中: ${progress.currentIp}`
          : progress.completed > 0
            ? `已完成 ${progress.completed}/${progress.total}`
            : '就绪'}
      </div>
    </div>
  );
};
