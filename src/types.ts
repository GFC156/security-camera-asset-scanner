export type PlatformProtocol = 'GB28181' | 'EHome' | 'EZVIZ';

export interface GB28181Detail {
  enabled: boolean;
  id?: string;
  sipIp?: string;
  sipPort?: string;
  status?: '在线' | '未注册' | '离线' | string;
  rawStatus?: string;
}

export interface EHomeDetail {
  enabled: boolean;
  version?: string;
  serverIp?: string;
  serverPort?: string;
  status?: '在线' | '未注册' | '离线' | string;
  rawStatus?: string;
}

export interface EZVIZDetail {
  enabled: boolean;
  status?: '在线' | '未注册' | '离线' | string;
  rawStatus?: string;
}

/** 网络质量测试结果 (MOS 评分) */
export interface QualityResult {
  mos: number;            // 1.0 - 4.5
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeDesc: string;      // 优秀/良好/一般/较差/极差
  color: 'green' | 'lime' | 'yellow' | 'orange' | 'red';
  latency: number;        // 平均延迟 ms
  jitter: number;          // 抖动 ms
  packetLossPct: number;  // 丢包率 %
  minRtt: number;          // 最小 RTT
  maxRtt: number;          // 最大 RTT
  samples: number;         // 采样次数
  successes: number;       // 成功次数
  failures: number;        // 失败次数
  connectionType: string;  // HTTP/HTTPS
  testedAt: string;
}

export interface CameraAsset {
  id: string;
  ip: string;
  mac: string;
  name: string;
  model: string;
  serial: string;
  firmware: string;
  platform: string;
  gb28181?: GB28181Detail;
  ehome?: EHomeDetail;
  ezviz?: EZVIZDetail;
  quality?: QualityResult;   // 网络质量测试结果
  vendor?: string;
  deviceType?: 'IPC' | 'NVR' | 'DVR' | 'PTZ' | 'Thermal' | 'Speed Dome';
  channels?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskIssues?: string[];
  rawXml?: {
    deviceInfo?: string;
    gbXml?: string;
    ehomeXml?: string;
    ezvizXml?: string;
  };
  discoveredAt: string;
}

export interface ScanConfig {
  network: string;
  user: string;
  pwd: string;
  maxThreads: number;
  timeoutMs: number;
  // Comma/space separated list or ranges to exclude from scanning (e.g. "192.168.1.5,192.168.1.10-12")
  exclude?: string;
  // 每个 IP 的最大扫描尝试次数（认证尝试次数），默认 1
  scanAttempts?: number;
  protocols: {
    gb28181: boolean;
    ehome: boolean;
    ezviz: boolean;
  };
}

export interface ScanProgress {
  completed: number;
  total: number;
  successCount: number;
  isScanning: boolean;
  currentIp: string;
  elapsedMs: number;
  scanRate: number;
}

export interface AiDiagnosisResult {
  summary: string;
  securityScore: number;
  vulnerabilities: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    remediation: string;
  }>;
  complianceChecks: Array<{
    standard: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
  }>;
  recommendations: string[];
}
