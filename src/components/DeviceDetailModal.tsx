import React, { useState } from 'react';
import { CameraAsset } from '../types';
import {
  X,
  Camera,
  ShieldAlert,
  Radio,
  Server,
  Cloud,
  Code2,
  Copy,
  Check,
  Cpu,
  Layers,
  Globe,
  Terminal,
  Activity,
  Gauge,
  Loader2,
  Wifi,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface DeviceDetailModalProps {
  asset: CameraAsset | null;
  onClose: () => void;
  onQualityTest?: (ip: string) => void;
}

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  asset,
  onClose,
  onQualityTest,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'quality' | 'platform' | 'xml'>('info');
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(asset, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#E4E3E0] border-2 border-[#141414] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#141414]">
        {/* Modal Header */}
        <div className="p-4 bg-[#141414] text-[#E4E3E0] border-b border-[#141414] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#E4E3E0] text-[#141414] border border-[#E4E3E0]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E4E3E0] flex items-center space-x-2">
                <span>{asset.name || '安防监控设备'}</span>
                <span className="text-xs font-mono-tech font-bold bg-[#E4E3E0] text-[#141414] px-2 py-0.5 border border-[#E4E3E0]">
                  {asset.ip}
                </span>
              </h3>
              <p className="text-xs text-[#DCDAD7] mt-0.5 font-mono-tech">
                MAC: {asset.mac} | 序列号: {asset.serial}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#E4E3E0] hover:bg-[#E4E3E0] hover:text-[#141414] border border-[#E4E3E0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-[#141414] bg-[#DCDAD7] px-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2.5 px-4 text-xs font-mono-tech font-bold uppercase flex items-center space-x-1.5 transition-colors cursor-pointer border-r border-[#141414] ${
              activeTab === 'info'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'text-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>设备基础信息</span>
          </button>

          <button
            onClick={() => setActiveTab('platform')}
            className={`py-2.5 px-4 text-xs font-mono-tech font-bold uppercase flex items-center space-x-1.5 transition-colors cursor-pointer border-r border-[#141414] ${
              activeTab === 'platform'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'text-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>平台协议配置</span>
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`py-2.5 px-4 text-xs font-mono-tech font-bold uppercase flex items-center space-x-1.5 transition-colors cursor-pointer border-r border-[#141414] ${
              activeTab === 'quality'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'text-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>网络质量</span>
          </button>

          <button
            onClick={() => setActiveTab('xml')}
            className={`py-2.5 px-4 text-xs font-mono-tech font-bold uppercase flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'xml'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'text-[#141414] hover:bg-[#E4E3E0]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>RAW ISAPI XML</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                  <div className="text-[10px] font-mono-tech uppercase font-bold text-[#141414]/70">设备类型 & 厂商</div>
                  <div className="text-sm font-bold text-[#141414] mt-0.5">
                    {asset.vendor || '海康威视 / 兼容设备'} ({asset.deviceType || 'IPC'})
                  </div>
                </div>

                <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                  <div className="text-[10px] font-mono-tech uppercase font-bold text-[#141414]/70">设备型号</div>
                  <div className="text-sm font-mono-tech font-bold text-[#141414] mt-0.5">
                    {asset.model}
                  </div>
                </div>

                <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                  <div className="text-[10px] font-mono-tech uppercase font-bold text-[#141414]/70">固件版本</div>
                  <div className="text-xs font-mono-tech font-bold text-[#141414] mt-0.5">
                    {asset.firmware}
                  </div>
                </div>

                <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                  <div className="text-[10px] font-mono-tech uppercase font-bold text-[#141414]/70">硬件序列号</div>
                  <div className="text-xs font-mono-tech font-bold text-[#141414] mt-0.5">
                    {asset.serial}
                  </div>
                </div>
              </div>

              {/* Security Risk Assessment Box */}
              <div className="p-4 bg-[#DCDAD7] border border-[#141414] space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono-tech font-bold uppercase tracking-wider text-[#141414]">
                  <ShieldAlert className="w-4 h-4" />
                  <span>自动化安全合规排查结果</span>
                </div>
                <ul className="text-xs font-mono-tech text-[#141414] space-y-1 pl-5 list-disc font-bold">
                  {asset.riskIssues && asset.riskIssues.length > 0 ? (
                    asset.riskIssues.map((issue, i) => (
                      <li key={i} className="text-[#141414]">
                        {issue}
                      </li>
                    ))
                  ) : (
                    <li className="text-[#141414]">
                      该设备未发现高危漏洞或异常暴露端口
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'quality' && (
            <div className="space-y-4">
              {/* 操作区 */}
              <div className="p-4 bg-[#DCDAD7] border border-[#141414] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  <span className="text-xs font-mono-tech font-bold uppercase">网络质量 MOS 评分</span>
                </div>
                <button
                  onClick={() => onQualityTest?.(asset.ip)}
                  disabled={asset.quality?.mos === -1}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-tech font-bold uppercase border border-[#141414] bg-[#141414] text-[#E4E3E0] hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {asset.quality?.mos === -1 ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Activity className="w-3.5 h-3.5" />
                  )}
                  <span>{asset.quality?.mos === -1 ? '测试中...' : '开始测试'}</span>
                </button>
              </div>

              {/* 未测试提示 */}
              {!asset.quality && (
                <div className="p-6 text-center text-xs text-[#666] font-mono-tech">
                  <Wifi className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  点击右上角"开始测试"按钮,主动测量该设备的网络质量
                  <div className="mt-2 text-[10px]">不影响扫描流程,8 次 HTTP 探测 + MOS 评分计算</div>
                </div>
              )}

              {/* 测试中 */}
              {asset.quality?.mos === -1 && (
                <div className="p-6 text-center text-xs text-[#666] font-mono-tech">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  正在向 {asset.ip} 发送 8 次探测请求...
                </div>
              )}

              {/* 测试结果 */}
              {asset.quality && asset.quality.mos >= 0 && (
                <>
                  {/* MOS 大数字 */}
                  <div className="p-5 bg-[#DCDAD7] border-2 border-[#141414] text-center">
                    <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[#666]">综合 MOS 评分</div>
                    <div className={`text-5xl font-mono-tech font-bold tabular-nums mt-1 ${
                      asset.quality.color === 'green' ? 'text-green-700' :
                      asset.quality.color === 'lime' ? 'text-lime-600' :
                      asset.quality.color === 'yellow' ? 'text-yellow-600' :
                      asset.quality.color === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {asset.quality.mos}
                    </div>
                    <div className="text-sm font-bold mt-1">
                      评级 {asset.quality.grade} · {asset.quality.gradeDesc}
                    </div>
                    <div className="text-[10px] text-[#666] mt-1">
                      测试时间: {new Date(asset.quality.testedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  {/* 详细指标 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                      <div className="flex items-center gap-1 text-[10px] font-mono-tech uppercase text-[#666]">
                        <Zap className="w-3 h-3" /> 平均延迟
                      </div>
                      <div className="text-lg font-mono-tech font-bold tabular-nums">
                        {asset.quality.latency}<span className="text-xs ml-0.5">ms</span>
                      </div>
                    </div>
                    <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                      <div className="flex items-center gap-1 text-[10px] font-mono-tech uppercase text-[#666]">
                        <TrendingUp className="w-3 h-3" /> 抖动
                      </div>
                      <div className="text-lg font-mono-tech font-bold tabular-nums">
                        {asset.quality.jitter}<span className="text-xs ml-0.5">ms</span>
                      </div>
                    </div>
                    <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                      <div className="flex items-center gap-1 text-[10px] font-mono-tech uppercase text-[#666]">
                        <Wifi className="w-3 h-3" /> 丢包率
                      </div>
                      <div className="text-lg font-mono-tech font-bold tabular-nums">
                        {asset.quality.packetLossPct}<span className="text-xs ml-0.5">%</span>
                      </div>
                    </div>
                    <div className="p-3 bg-[#DCDAD7] border border-[#141414]">
                      <div className="flex items-center gap-1 text-[10px] font-mono-tech uppercase text-[#666]">
                        <Activity className="w-3 h-3" /> 连接方式
                      </div>
                      <div className="text-xs font-mono-tech font-bold mt-1">
                        {asset.quality.connectionType}
                      </div>
                    </div>
                  </div>

                  {/* RTT 范围 */}
                  <div className="p-3 bg-[#DCDAD7] border border-[#141414] flex items-center justify-between text-xs font-mono-tech">
                    <span className="text-[#666] uppercase">RTT 范围</span>
                    <span className="font-bold tabular-nums">
                      {asset.quality.minRtt}ms (min) ~ {asset.quality.maxRtt}ms (max)
                    </span>
                  </div>

                  {/* 采样统计 */}
                  <div className="p-3 bg-[#DCDAD7] border border-[#141414] flex items-center justify-between text-xs font-mono-tech">
                    <span className="text-[#666] uppercase">采样统计</span>
                    <span className="font-bold tabular-nums">
                      共 {asset.quality.samples} 次 · 成功 {asset.quality.successes} · 失败 {asset.quality.failures}
                    </span>
                  </div>

                  {/* 评级标准 */}
                  <div className="p-3 bg-[#E4E3E0] border border-[#141414] text-[10px] font-mono-tech text-[#666]">
                    <div className="font-bold uppercase mb-1 text-[#141414]">评级标准 (基于 ITU-T G.107 E-Model)</div>
                    <div className="grid grid-cols-5 gap-1">
                      <div>A · 4.0+</div>
                      <div>B · 3.5+</div>
                      <div>C · 3.0+</div>
                      <div>D · 2.0+</div>
                      <div>F · &lt;2.0</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'platform' && (
            <div className="space-y-4">
              {/* GB28181 */}
              <div className="p-4 bg-[#DCDAD7] border border-[#141414] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono-tech font-bold uppercase text-[#141414]">
                    <Radio className="w-4 h-4" />
                    <span>GB28181 (公安/安防国标 SIP 协议)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs border font-mono-tech font-bold uppercase ${
                      asset.gb28181?.enabled
                        ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                        : 'bg-transparent text-[#141414]/60 border-[#141414]/40'
                    }`}
                  >
                    {asset.gb28181?.enabled
                      ? `已开启 [${asset.gb28181.status || '配置完成'}]`
                      : '未开启 / 未配置'}
                  </span>
                </div>

                {asset.gb28181?.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-xs font-mono-tech">
                    <div className="p-2 bg-[#E4E3E0] border border-[#141414]">
                      <span className="text-[#141414]/70 block text-[10px] font-bold">国标 ID:</span>
                      <span className="text-[#141414] font-bold">{asset.gb28181.id || '-'}</span>
                    </div>
                    <div className="p-2 bg-[#E4E3E0] border border-[#141414]">
                      <span className="text-[#141414]/70 block text-[10px] font-bold">SIP 服务端:</span>
                      <span className="text-[#141414] font-bold">
                        {asset.gb28181.sipIp
                          ? `${asset.gb28181.sipIp}:${asset.gb28181.sipPort}`
                          : '-'}
                      </span>
                    </div>
                    <div className="p-2 bg-[#E4E3E0] border border-[#141414]">
                      <span className="text-[#141414]/70 block text-[10px] font-bold">注册状态:</span>
                      <span className="text-[#141414] font-bold">
                        {asset.gb28181.status || '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* EHome / ISUP */}
              <div className="p-4 bg-[#DCDAD7] border border-[#141414] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono-tech font-bold uppercase text-[#141414]">
                    <Server className="w-4 h-4" />
                    <span>EHome / ISUP (海康平台主动注册协议)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs border font-mono-tech font-bold uppercase ${
                      asset.ehome?.enabled
                        ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                        : 'bg-transparent text-[#141414]/60 border-[#141414]/40'
                    }`}
                  >
                    {asset.ehome?.enabled
                      ? `${asset.ehome.version || 'ISUP'} [${asset.ehome.status || '已开启'}]`
                      : '未开启'}
                  </span>
                </div>

                {asset.ehome?.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs font-mono-tech">
                    <div className="p-2 bg-[#E4E3E0] border border-[#141414]">
                      <span className="text-[#141414]/70 block text-[10px] font-bold">ISUP 接入地址:</span>
                      <span className="text-[#141414] font-bold">
                        {asset.ehome.serverIp
                          ? `${asset.ehome.serverIp}:${asset.ehome.serverPort}`
                          : '-'}
                      </span>
                    </div>
                    <div className="p-2 bg-[#E4E3E0] border border-[#141414]">
                      <span className="text-[#141414]/70 block text-[10px] font-bold">状态:</span>
                      <span className="text-[#141414] font-bold">
                        {asset.ehome.status || '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* EZVIZ Cloud */}
              <div className="p-4 bg-[#DCDAD7] border border-[#141414] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono-tech font-bold uppercase text-[#141414]">
                    <Cloud className="w-4 h-4" />
                    <span>萤石云 EZVIZ (云托管云存)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs border font-mono-tech font-bold uppercase ${
                      asset.ezviz?.enabled
                        ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                        : 'bg-transparent text-[#141414]/60 border-[#141414]/40'
                    }`}
                  >
                    {asset.ezviz?.enabled ? `已开启 [${asset.ezviz.status}]` : '未开启'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'xml' && (
            <div className="space-y-3 font-mono-tech text-xs">
              <div className="flex items-center justify-between text-[#141414]">
                <span className="font-bold uppercase">ISAPI Standard Responses (RAW XML)</span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center space-x-1 px-2 py-1 bg-[#141414] text-[#E4E3E0] border border-[#141414] text-[11px] font-bold uppercase cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-[#E4E3E0]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? '已复制 JSON' : '复制资产数据'}</span>
                </button>
              </div>

              <div className="p-3 bg-[#141414] text-[#E4E3E0] border border-[#141414] overflow-x-auto max-h-80 font-mono-tech">
                <pre>{asset.rawXml?.deviceInfo || JSON.stringify(asset, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[#DCDAD7] border-t border-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141414] text-[#E4E3E0] border border-[#141414] text-xs font-mono-tech font-bold uppercase cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
