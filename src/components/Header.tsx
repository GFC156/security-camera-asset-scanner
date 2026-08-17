import React, { useState } from 'react';
import { ScanConfig, ScanProgress } from '../types';
import { Play, Square, FileSpreadsheet, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

interface HeaderProps {
  config: ScanConfig;
  onChangeConfig: (newConfig: ScanConfig) => void;
  onStartScan: () => void;
  onStopScan: () => void;
  onExportCsv: () => void;
  isScanning: boolean;
  totalAssets: number;
  progress: ScanProgress;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onChangeConfig,
  onStartScan,
  onStopScan,
  onExportCsv,
  isScanning,
  totalAssets,
  progress,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: keyof ScanConfig, value: any) => {
    onChangeConfig({ ...config, [field]: value });
  };

  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : 0;

  const inputCls =
    'bg-[#2a2a2a] text-[#E4E3E0] border border-[#555] px-2 py-1 text-xs font-mono-tech placeholder-[#888] focus:outline-none focus:border-[#E4E3E0] disabled:opacity-50';
  const labelCls =
    'text-[10px] font-mono-tech uppercase tracking-[0.1em] text-[#888] mr-1 whitespace-nowrap';
  const btnCls =
    'flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-tech font-bold uppercase tracking-wider border transition-all';
  const btnEnabled = 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0] hover:bg-white cursor-pointer';
  const btnDisabled = 'bg-transparent text-[#888] border-[#555] cursor-not-allowed';

  return (
    <header className="bg-[#141414] text-[#E4E3E0] border-b-2 border-[#141414]">
      {/* 单行融合: 标题 + 参数 + 按钮 + 统计 + CSV + 进度 */}
      <div className="w-full px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-bold tracking-tight whitespace-nowrap">安防监控资产扫描</span>
        <span className="text-[10px] font-mono-tech text-[#888] whitespace-nowrap">
          ISAPI · GB28181 · EHome · 萤石云
        </span>
        <span className="w-px h-4 bg-[#444] flex-shrink-0"></span>

        <div className="flex items-center">
          <span className={labelCls}>网段</span>
          <input
            type="text"
            value={config.network}
            onChange={(e) => handleInputChange('network', e.target.value)}
            placeholder="192.168.1.0/24"
            disabled={isScanning}
            className={`${inputCls} w-36`}
          />
        </div>

        <div className="flex items-center">
          <span className={labelCls}>账号</span>
          <input
            type="text"
            value={config.user}
            onChange={(e) => handleInputChange('user', e.target.value)}
            placeholder="admin"
            disabled={isScanning}
            className={`${inputCls} w-20`}
          />
        </div>

        <div className="flex items-center">
          <span className={labelCls}>密码</span>
          <input
            type="password"
            value={config.pwd}
            onChange={(e) => handleInputChange('pwd', e.target.value)}
            placeholder="必填"
            disabled={isScanning}
            className={`${inputCls} w-24`}
          />
        </div>

        <div className="flex items-center">
          <span className={labelCls}>排除</span>
          <input
            type="text"
            value={(config as any).exclude || ''}
            onChange={(e) => handleInputChange('exclude', e.target.value)}
            placeholder="可选"
            disabled={isScanning}
            className={`${inputCls} w-20`}
          />
        </div>

        <button
          onClick={onStartScan}
          disabled={isScanning}
          className={`${btnCls} ${
            isScanning
              ? 'bg-transparent text-[#888] border-[#555] cursor-not-allowed'
              : 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0] hover:bg-white cursor-pointer'
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>开始</span>
        </button>

        {isScanning && (
          <span className="text-sm font-mono-tech font-bold text-[#E4E3E0] tabular-nums min-w-[3em]">
            {percent}%
          </span>
        )}

        <button
          onClick={onStopScan}
          disabled={!isScanning}
          className={`${btnCls} ${
            isScanning
              ? 'bg-[#8B2D2D] text-white border-[#8B2D2D] hover:bg-[#A53838] cursor-pointer'
              : 'bg-transparent text-[#888] border-[#555] cursor-not-allowed'
          }`}
        >
          <Square className="w-3 h-3 fill-current" />
          <span>停止</span>
        </button>

        {/* 统计数字融合进右侧 */}
        <div className="flex items-center gap-3 pl-3 ml-auto border-l border-[#444]">
          <div className="text-[11px] font-mono-tech">
            <span className="text-[#888]">发现</span>{' '}
            <span className="font-bold text-sm">{totalAssets}</span>
          </div>
          <div className="text-[11px] font-mono-tech">
            <span className="text-[#888]">进度</span>{' '}
            <span className="font-bold text-sm">{progress.completed}/{progress.total}</span>
          </div>
          {progress.elapsedMs > 0 && (
            <div className="text-[11px] font-mono-tech">
              <span className="text-[#888]">用时</span>{' '}
              <span className="font-bold text-sm">
                {Math.floor(progress.elapsedMs / 1000)}s
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onExportCsv}
          disabled={totalAssets === 0}
          className={`${btnCls} ${totalAssets > 0 ? btnEnabled : btnDisabled}`}
          title="导出为 CSV 文件"
        >
          <FileSpreadsheet className="w-3 h-3" />
          <span>CSV</span>
        </button>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[11px] font-mono-tech text-[#888] hover:text-[#E4E3E0] uppercase"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>高级</span>
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* 高级设置折叠区 */}
      {showAdvanced && (
        <div className="w-full px-4 py-2.5 bg-[#1f1f1f] border-t border-[#2a2a2a] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="mb-1 text-[#888] font-mono-tech uppercase text-[10px]">扫描尝试次数</div>
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              value={(config as any).scanAttempts || 1}
              onChange={(e) => handleInputChange('scanAttempts', Math.max(1, parseInt(e.target.value || '1', 10)))}
              disabled={isScanning}
              className="w-full bg-[#2a2a2a] border border-[#555] px-2 py-1 text-sm text-[#E4E3E0] font-mono-tech focus:outline-none focus:border-[#E4E3E0]"
            />
            <div className="text-[10px] text-[#888] pt-0.5">默认 3,尝试 Digest/Basic/HTTPS</div>
          </div>
          <div>
            <div className="mb-1 text-[#888] font-mono-tech uppercase text-[10px]">并发线程数</div>
            <input
              type="number"
              min={1}
              max={200}
              step={1}
              value={config.maxThreads}
              onChange={(e) => handleInputChange('maxThreads', Math.max(1, parseInt(e.target.value || '1', 10)))}
              disabled={isScanning}
              className="w-full bg-[#2a2a2a] border border-[#555] px-2 py-1 text-sm text-[#E4E3E0] font-mono-tech focus:outline-none focus:border-[#E4E3E0]"
            />
            <div className="text-[10px] text-[#888] pt-0.5">并行扫描 IP 数量</div>
          </div>
          <div>
            <div className="mb-1 text-[#888] font-mono-tech uppercase text-[10px]">超时 (ms)</div>
            <input
              type="number"
              min={100}
              max={20000}
              step={50}
              value={config.timeoutMs}
              onChange={(e) => handleInputChange('timeoutMs', Math.max(100, parseInt(e.target.value || '100', 10)))}
              disabled={isScanning}
              className="w-full bg-[#2a2a2a] border border-[#555] px-2 py-1 text-sm text-[#E4E3E0] font-mono-tech focus:outline-none focus:border-[#E4E3E0]"
            />
            <div className="text-[10px] text-[#888] pt-0.5">单 IP 请求等待时长</div>
          </div>
        </div>
      )}
    </header>
  );
};
