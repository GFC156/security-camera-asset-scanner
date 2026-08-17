import React from 'react';
import { ScanProgress } from '../types';

interface ProgressBannerProps {
  progress: ScanProgress;
  statusMessage: string;
}

/**
 * 极简状态行:仅显示状态文字,无进度条(进度百分比已挪到 Header 开始按钮旁)。
 * 这样扫描中下方的表格不会因为进度条高度变化而抖动。
 */
export const ProgressBanner: React.FC<ProgressBannerProps> = ({
  progress,
  statusMessage,
}) => {
  return (
    <div className="bg-[#DCDAD7] border-b border-[#999] px-4 py-1.5 text-[11px] font-mono-tech text-[#444] flex items-center justify-between">
      <span className="truncate">
        {statusMessage || '就绪'}
      </span>
      {progress.isScanning && progress.currentIp && (
        <span className="text-[#666] ml-2 flex-shrink-0">
          当前: <span className="font-bold text-[#141414]">{progress.currentIp}</span>
        </span>
      )}
    </div>
  );
};
