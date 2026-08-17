import React, { useState, useMemo } from 'react';
import { CameraAsset, QualityResult } from '../types';
import { TABLE_HEADERS } from '../utils/exporter';
import { matchesProtocolFilter, parsePlatformInfo } from '../utils/platformUtils';
import {
  Search,
  Copy,
  Check,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Activity,
  Loader2,
} from 'lucide-react';

interface AssetTableProps {
  assets: CameraAsset[];
  onSelectAsset: (asset: CameraAsset) => void;
  selectedProtocolFilter: string;
  onQualityTest?: (ip: string) => void;
}

/** MOS 评分 badge */
function MosBadge({ quality }: { quality?: QualityResult }) {
  if (!quality) return null;
  // loading 状态
  if (quality.mos === -1) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono-tech text-[#666] px-1 py-0.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        测试中
      </span>
    );
  }

  const colorMap: Record<string, string> = {
    green: 'bg-green-700 text-white border-green-900',
    lime: 'bg-lime-600 text-white border-lime-800',
    yellow: 'bg-yellow-500 text-black border-yellow-700',
    orange: 'bg-orange-500 text-white border-orange-700',
    red: 'bg-red-600 text-white border-red-800',
  };
  const cls = colorMap[quality.color] || 'bg-gray-500 text-white border-gray-700';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-mono-tech font-bold ${cls}`}
      title={`MOS ${quality.mos} (${quality.gradeDesc})\n延迟 ${quality.latency}ms · 抖动 ${quality.jitter}ms\n丢包 ${quality.packetLossPct}% · ${quality.connectionType}\n采样 ${quality.samples} 次 (成功 ${quality.successes}/${quality.samples})`}
    >
      <Activity className="w-3 h-3" />
      <span>MOS {quality.mos}</span>
      <span className="opacity-80">·{quality.grade}</span>
    </span>
  );
}

/** 紧凑协议 badge:单行内显示，不换行，行高一致 */
function PlatformBadge({ asset }: { asset: CameraAsset }) {
  const info = parsePlatformInfo(asset);
  const tags: { label: string; status: string; color: string }[] = [];

  if (info.gb28181.enabled) {
    tags.push({ label: 'GB28181', status: info.gb28181.status, color: 'bg-[#141414] text-[#E4E3E0]' });
  }
  if (info.ehome.enabled) {
    tags.push({ label: 'EHome', status: info.ehome.status, color: 'bg-[#2a4a6b] text-[#E4E3E0]' });
  }
  if (info.ezviz.enabled) {
    tags.push({ label: '萤石', status: info.ezviz.status, color: 'bg-[#4a3820] text-[#E4E3E0]' });
  }

  if (tags.length === 0) {
    return <span className="text-[#141414]/40 text-[11px] italic font-mono-tech">未配置</span>;
  }

  const statusMap: Record<string, string> = {
    在线: 'border-green-600',
    未注册: 'border-yellow-600',
    离线: 'border-red-600',
  };

  return (
    <div className="flex flex-wrap gap-1 whitespace-nowrap">
      {tags.map((t, i) => (
        <span
          key={i}
          className={`inline-flex items-center text-[10px] px-1.5 py-0.5 border font-mono-tech font-bold ${t.color} ${statusMap[t.status] || 'border-[#555]'}`}
          title={`${t.label}${t.status ? ' — ' + t.status : ''}`}
        >
          {t.label}
          {t.status && <span className="ml-1 opacity-80">·{t.status}</span>}
        </span>
      ))}
    </div>
  );
}

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  onSelectAsset,
  selectedProtocolFilter,
  onQualityTest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof CameraAsset>('ip');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (!matchesProtocolFilter(asset, selectedProtocolFilter)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        asset.ip.toLowerCase().includes(q) ||
        asset.mac.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.model.toLowerCase().includes(q) ||
        asset.serial.toLowerCase().includes(q) ||
        asset.firmware.toLowerCase().includes(q) ||
        asset.platform.toLowerCase().includes(q)
      );
    });
  }, [assets, searchQuery, selectedProtocolFilter]);

  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'ip') {
        const numA = a.ip.split('.').reduce((acc, oct) => acc * 256 + parseInt(oct || '0', 10), 0);
        const numB = b.ip.split('.').reduce((acc, oct) => acc * 256 + parseInt(oct || '0', 10), 0);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortField, sortOrder]);

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleSort = (field: keyof CameraAsset) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedAssets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedAssets.map((a) => a.id)));
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <div className="bg-[#E4E3E0] border border-[#141414] overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2 bg-[#DCDAD7] border-b border-[#141414] flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#666] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="检索 IP/MAC/名称/型号/序列号..."
            className="w-full bg-[#E4E3E0] border border-[#141414] pl-7 pr-3 py-1 text-xs text-[#141414] placeholder-[#141414]/50 focus:outline-none focus:bg-white font-mono-tech"
          />
        </div>
        <div className="text-[11px] font-mono-tech text-[#666]">
          显示: <span className="font-bold text-[#141414]">{sortedAssets.length}</span> / {assets.length}
          {selectedIds.size > 0 && (
            <span className="ml-2 bg-[#141414] text-[#E4E3E0] px-2 py-0.5 font-bold">已选 {selectedIds.size}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[300px] max-h-[calc(100vh-280px)]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#141414] text-[#E4E3E0] sticky top-0 z-10 text-[11px] font-mono-tech font-bold uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 w-8 text-center">
                <input
                  type="checkbox"
                  checked={sortedAssets.length > 0 && selectedIds.size === sortedAssets.length}
                  onChange={toggleSelectAll}
                  className="border-[#E4E3E0] accent-[#E4E3E0] cursor-pointer"
                />
              </th>
              <th onClick={() => toggleSort('ip')} className="px-3 py-2 cursor-pointer hover:bg-black select-none whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <span>IP</span>
                  {sortField === 'ip' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th onClick={() => toggleSort('mac')} className="px-3 py-2 cursor-pointer hover:bg-black select-none whitespace-nowrap">MAC</th>
              <th onClick={() => toggleSort('name')} className="px-3 py-2 cursor-pointer hover:bg-black select-none whitespace-nowrap">名称</th>
              <th className="px-3 py-2 whitespace-nowrap">型号</th>
              <th className="px-3 py-2 whitespace-nowrap">序列号</th>
              <th className="px-3 py-2 whitespace-nowrap">固件</th>
              <th className="px-3 py-2 whitespace-nowrap">协议</th>
              <th className="px-3 py-2 whitespace-nowrap text-right">质量</th>
            </tr>
          </thead>
          <tbody className="bg-[#E4E3E0]">
            {sortedAssets.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 px-6 text-center text-[#141414]/70">
                  <div className="max-w-xl mx-auto text-left bg-[#DCDAD7] border border-[#141414] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4" />
                      <div className="font-bold text-sm uppercase tracking-wider">未发现监控设备</div>
                    </div>
                    <div className="text-[11px] space-y-1 text-[#333]">
                      <p>请确认:目标网段正确 / 账号密码正确 / 设备支持 ISAPI 协议。</p>
                      <p>详情排查请查看 <span className="font-mono-tech font-bold">工具 → 打开日志文件</span>。</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedAssets.map((asset, idx) => {
                const isSelected = selectedIds.has(asset.id);
                const isEven = idx % 2 === 0;
                return (
                  <tr
                    key={asset.id}
                    onClick={() => onSelectAsset(asset)}
                    className={`hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-pointer group ${
                      isSelected ? 'bg-[#DCDAD7] font-bold' : isEven ? 'bg-[#E4E3E0]' : 'bg-[#DCDAD7]'
                    }`}
                  >
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(e as any, asset.id)}
                        className="accent-[#141414] cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono-tech font-bold whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="underline group-hover:text-[#E4E3E0]">{asset.ip}</span>
                        <button
                          onClick={(e) => handleCopy(e, asset.ip, `ip-${asset.id}`)}
                          className="opacity-0 group-hover:opacity-100 p-0.5"
                          title="复制 IP"
                        >
                          {copiedId === `ip-${asset.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono-tech whitespace-nowrap text-[11px]">
                      {asset.mac || '未知'}
                    </td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap max-w-[140px] truncate">
                      {asset.name || '默认设备'}
                    </td>
                    <td className="px-3 py-2 font-mono-tech whitespace-nowrap">
                      <span className="px-1.5 py-0.5 border border-[#141414] group-hover:border-[#E4E3E0] text-[11px]">
                        {asset.model || '未知型号'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono-tech whitespace-nowrap max-w-[150px] truncate opacity-80 text-[11px]">
                      {asset.serial || '未知'}
                    </td>
                    <td className="px-3 py-2 font-mono-tech whitespace-nowrap text-[11px] opacity-70">
                      {asset.firmware || '未知'}
                    </td>
                    <td className="px-3 py-2">
                      <PlatformBadge asset={asset} />
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {asset.quality && <MosBadge quality={asset.quality} />}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQualityTest?.(asset.ip);
                          }}
                          disabled={asset.quality?.mos === -1}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono-tech font-bold uppercase border border-[#141414] group-hover:border-[#E4E3E0] disabled:opacity-50 disabled:cursor-not-allowed"
                          title="测试该监控的网络质量 (MOS 评分)"
                        >
                          {asset.quality?.mos === -1 ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Activity className="w-3 h-3" />
                          )}
                          <span>{asset.quality?.mos === -1 ? '测试中' : '测速'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
