import React, { useState, useRef, useEffect } from 'react';
import { CameraAsset, ScanConfig, ScanProgress, QualityResult } from './types';
import { parseIpInput } from './utils/ipUtils';
import { exportToCSV } from './utils/exporter';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { AssetTable } from './components/AssetTable';
import { DeviceDetailModal } from './components/DeviceDetailModal';

export default function App() {
  const [config, setConfig] = useState<ScanConfig>({
    network: '192.168.1.0/24',
    user: 'admin',
    pwd: '',
    maxThreads: 20,
    timeoutMs: 2000,
    exclude: '',
    scanAttempts: 3,
    protocols: {
      gb28181: true,
      ehome: true,
      ezviz: true,
    },
  });

  const [assets, setAssets] = useState<CameraAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<CameraAsset | null>(null);
  const [selectedProtocolFilter, setSelectedProtocolFilter] = useState('all');

  const [progress, setProgress] = useState<ScanProgress>({
    completed: 0,
    total: 0,
    successCount: 0,
    isScanning: false,
    currentIp: '',
    elapsedMs: 0,
    scanRate: 0,
  });

  const [statusMessage, setStatusMessage] = useState('就绪');

  // Scanner references
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Stop Timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start Scanner
  const handleStartScan = async () => {
    // Validate Password
    if (!config.pwd) {
      alert('账号或密码不能为空！请填写监控设备密码。');
      return;
    }
    if (!config.user) {
      alert('监控账号不能为空！');
      return;
    }

    const targetIps = parseIpInput(config.network);
    if (!targetIps || targetIps.length === 0) {
      alert('无法解析目标网段格式，请输入有效的 CIDR (如 192.168.1.0/24) 或范围 (如 10.0.0.1-50)');
      return;
    }

    // Parse exclude list and filter targets to avoid scanning excluded addresses
    const excludeIps = config.exclude ? new Set(parseIpInput(config.exclude)) : new Set<string>();
    const filteredTargets = targetIps.filter((ip) => !excludeIps.has(ip));
    if (filteredTargets.length === 0) {
      alert('排除后没有可扫描的 IP，请检查排除地址配置');
      return;
    }

    // Reset scan state
    setAssets([]);
    setProgress({
      completed: 0,
      total: filteredTargets.length,
      successCount: 0,
      isScanning: true,
      currentIp: filteredTargets[0] || '',
      elapsedMs: 0,
      scanRate: 0,
    });

    setStatusMessage(`开始自动化扫描，共 ${filteredTargets.length} 个节点 (已排除 ${excludeIps.size} 个)...`);

    // Setup abort controller
    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();

    // Timer tick for elapsed time
    stopTimer();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress((prev) => ({
        ...prev,
        elapsedMs: elapsed,
      }));
    }, 200);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          ipList: filteredTargets,
          user: config.user,
          pwd: config.pwd,
          maxThreads: config.maxThreads,
          timeoutMs: config.timeoutMs,
          excludeList: Array.from(excludeIps),
          scanAttempts: config.scanAttempts || 1,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('网络扫描服务响应异常');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', '').trim());

              if (data.type === 'result') {
                if (data.asset) {
                  setAssets((prev) => {
                    // Prevent duplicates
                    if (prev.some((a) => a.ip === data.asset.ip)) return prev;
                    return [...prev, data.asset];
                  });
                }

                setProgress((prev) => ({
                  ...prev,
                  completed: data.completed,
                  total: data.total,
                  successCount: data.successCount,
                  currentIp: data.currentIp,
                }));

                setStatusMessage(`正在并发扫描: ${data.currentIp}`);
              } else if (data.type === 'progress') {
                setProgress((prev) => ({
                  ...prev,
                  completed: data.completed,
                  total: data.total,
                  successCount: data.successCount,
                  currentIp: data.currentIp,
                }));
              } else if (data.type === 'finished') {
                stopTimer();
                setProgress((prev) => ({
                  ...prev,
                  isScanning: false,
                  completed: data.completed,
                  total: data.total,
                  successCount: data.successCount,
                }));

                setStatusMessage(
                  `扫描完成！已获取 ${data.successCount}/${data.total} 台设备资产与平台接入信息。`
                );
              }
            } catch {
              // Ignore malformed chunk
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatusMessage('扫描已被用户终止。');
      } else {
        setStatusMessage(`扫描中断: ${err.message || '未知错误'}`);
      }
    } finally {
      stopTimer();
      setProgress((prev) => ({ ...prev, isScanning: false }));
    }
  };

  // Stop Scanner
  const handleStopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopTimer();
    setProgress((prev) => ({ ...prev, isScanning: false }));
    setStatusMessage('正在终止扫描...');
  };

    // Note: simulation removed — no preloaded demo assets.

  // 网络质量测试 (主动触发,不影响扫描)
  const handleQualityTest = async (ip: string) => {
    // 标记该 IP 正在测试中
    setAssets((prev) =>
      prev.map((a) => (a.ip === ip ? { ...a, quality: { ...(a.quality || {}), mos: -1 } as any } : a))
    );

    try {
      const resp = await fetch('/api/quality-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          user: config.user,
          pwd: config.pwd,
          timeoutMs: config.timeoutMs,
          samples: 8,
        }),
      });

      if (!resp.ok) {
        throw new Error(`服务返回 ${resp.status}`);
      }

      const result = await resp.json();

      // 更新对应 IP 的 quality 字段
      setAssets((prev) =>
        prev.map((a) => (a.ip === ip ? { ...a, quality: result as QualityResult } : a))
      );
    } catch (err: any) {
      // 测试失败:清除 loading 标记,标记为错误
      setAssets((prev) =>
        prev.map((a) =>
          a.ip === ip
            ? {
                ...a,
                quality: {
                  mos: 0,
                  grade: 'F' as const,
                  gradeDesc: '测试失败',
                  color: 'red' as const,
                  latency: 0,
                  jitter: 0,
                  packetLossPct: 100,
                  minRtt: 0,
                  maxRtt: 0,
                  samples: 0,
                  successes: 0,
                  failures: 0,
                  connectionType: '不可达',
                  testedAt: new Date().toISOString(),
                } as QualityResult,
              }
            : a
        )
      );
      console.error('[quality-test]', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex flex-col selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* 顶部仪表板:标题 + 扫描参数 + 操作按钮 + 进度百分比 */}
      <Header
        config={config}
        onChangeConfig={setConfig}
        onStartScan={handleStartScan}
        onStopScan={handleStopScan}
        onExportCsv={() => exportToCSV(assets)}
        isScanning={progress.isScanning}
        totalAssets={assets.length}
        progress={progress}
      />

      {/* 协议过滤器行 */}
      <StatsOverview
        assets={assets}
        progress={progress}
        selectedProtocolFilter={selectedProtocolFilter}
        onSelectFilter={setSelectedProtocolFilter}
      />

      {/* 资产表格 */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-3">
        <AssetTable
          assets={assets}
          onSelectAsset={setSelectedAsset}
          selectedProtocolFilter={selectedProtocolFilter}
          onQualityTest={handleQualityTest}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141414] bg-[#DCDAD7] py-2 text-center text-[10px] font-mono-tech text-[#666]">
        安防监控资产全维度排查系统 &copy; {new Date().getFullYear()} — ISAPI / GB28181 / EHome ISUP / 萤石云
      </footer>

      {/* Device Detail Inspector Modal */}
      <DeviceDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onQualityTest={handleQualityTest}
      />
    </div>
  );
}
