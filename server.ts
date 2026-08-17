import express from 'express';
import path from 'path';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// Initialize Google GenAI lazily
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

// Clean XML Helper (matching Python's re.sub(r'xmlns="[^"]+"', '', xml_str))
function cleanXml(xmlStr: string): string {
  if (!xmlStr) return '';
  return xmlStr.replace(/xmlns="[^"]+"/g, '');
}

// Simple XML Tag Extractor Helper
function extractXmlTag(xml: string, tag: string, defaultValue = ''): string {
  if (!xml) return defaultValue;
  const match = xml.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'is'));
  if (match && match[1]) {
    return match[1].trim();
  }
  return defaultValue;
}

// ISAPI Fetcher with Digest/Basic auth simulation/real request
async function fetchIsapiXml(
  ip: string,
  xmlPath: string,
  username: string,
  pwd: string,
  timeoutMs = 2000,
  maxAttempts = 1
): Promise<string | null> {
  // Try HTTP first, then HTTPS if HTTP fails (some devices expose ISAPI on HTTPS)
  const tryFetch = (useHttps: boolean, authHeader?: string) =>
    new Promise<string | null>((resolve) => {
      const proto = useHttps ? 'https' : 'http';
      const url = `${proto}://${ip}${xmlPath}`;
      const reqModule = useHttps ? https : http;

      const options: any = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        timeout: timeoutMs,
      };
      if (authHeader) options.headers.Authorization = authHeader;

      const req = reqModule.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else if (res.statusCode === 401 && res.headers['www-authenticate']) {
            // Return 401 with www-authenticate header so caller can attempt digest
            resolve(JSON.stringify({ status: 401, header: res.headers['www-authenticate'] }));
          } else {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });

  // Helper to parse WWW-Authenticate header for Digest
  const parseDigestAuth = (header: string) => {
    const params: any = {};
    header.replace(/([a-z0-9_-]+)=(?:"([^"]+)"|([^,]+))/gi, (_, k, v1, v2) => {
      params[k] = v1 || v2;
      return '';
    });
    return params;
  };

  const md5 = (input: string) => crypto.createHash('md5').update(input).digest('hex');

  // If maxAttempts == 1, do a single try without any auth retries.
  if (maxAttempts <= 1) {
    const single = await tryFetch(false);
    if (single && typeof single === 'string' && !single.startsWith('{"status":401')) return single as string;
    return null;
  }

  // 1) Try HTTP without auth header (consumes one attempt)
  let attemptsLeft = maxAttempts;
  let resp = await tryFetch(false);
  attemptsLeft = Math.max(0, attemptsLeft - 1);
  if (resp && typeof resp === 'string' && resp.startsWith('{"status":401')) {
    // Digest challenge
    try {
      const obj = JSON.parse(resp);
      const www = Array.isArray(obj.header) ? obj.header[0] : obj.header;
      const params = parseDigestAuth(String(www));
      const realm = params.realm || '';
      const nonce = params.nonce || '';
      const qop = params.qop || 'auth';
      const algorithm = (params.algorithm || 'MD5').toUpperCase();

      const ha1 = md5(`${username}:${realm}:${pwd}`);
      const ha2 = md5(`GET:${xmlPath}`);
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');
      let responseDigest = '';

      if (qop) {
        responseDigest = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
      } else {
        responseDigest = md5(`${ha1}:${nonce}:${ha2}`);
      }

      const digestAuth = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${xmlPath}", algorithm=${algorithm}, response="${responseDigest}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

      // Retry with digest header over HTTP (consumes one attempt)
      if (attemptsLeft <= 0) return null;
      const withDigest = await tryFetch(false, digestAuth);
      attemptsLeft = Math.max(0, attemptsLeft - 1);
      if (withDigest) return withDigest as string;
    } catch (e) {
      // fallthrough to basic or https
    }
  } else if (resp) {
    return resp as string;
  }

  // 2) Try HTTP with Basic auth (some devices accept Basic even if not challenged)
  const basicAuth = 'Basic ' + Buffer.from(`${username}:${pwd}`).toString('base64');
  if (attemptsLeft > 0) {
    resp = await tryFetch(false, basicAuth);
    attemptsLeft = Math.max(0, attemptsLeft - 1);
    if (resp) return resp as string;
  }

  // 3) Try HTTPS with insecure TLS (some devices expose ISAPI over HTTPS with self-signed certs)
  // Note: ignore TLS verification by using globalAgent options is not ideal, but we create a custom agent
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const tryFetchHttps = (authHeader?: string) =>
    new Promise<string | null>((resolve) => {
      const url = `https://${ip}${xmlPath}`;
      const options: any = {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: timeoutMs,
        agent: httpsAgent,
      };
      if (authHeader) options.headers.Authorization = authHeader;

      const req = https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });

  // Try HTTPS with Digest (best-effort) then Basic
  // First try without auth
  // 3) Try HTTPS with insecure TLS (best effort), each attempt consumes attemptsLeft
  if (attemptsLeft > 0) {
    const httpsRaw = await tryFetchHttps();
    attemptsLeft = Math.max(0, attemptsLeft - 1);
    if (httpsRaw) return httpsRaw;
  }
  if (attemptsLeft > 0) {
    const httpsBasic = await tryFetchHttps(basicAuth);
    attemptsLeft = Math.max(0, attemptsLeft - 1);
    if (httpsBasic) return httpsBasic;
  }

  return null;
}

// Simulation removed: real scanning only. Previously there was a generator for demo devices — removed.

// Scanning worker for a single IP
async function scanSingleIp(ip: string, user: string, pwd: string, timeoutMs: number, maxAttempts = 1) {
  // Try real ISAPI fetch — honor maxAttempts for auth/network tries
  const devXml = await fetchIsapiXml(ip, '/ISAPI/System/deviceInfo', user, pwd, timeoutMs, maxAttempts);
  if (!devXml) {
    // No fallback to simulation — real scanning mode only
    return null;
  }

  const cleanDev = cleanXml(devXml);
  const devName = extractXmlTag(cleanDev, 'deviceName', '默认设备');
  let mac = extractXmlTag(cleanDev, 'macAddress', '未知');
  const serial = extractXmlTag(cleanDev, 'serialNumber', '未知序列号');
  const model = extractXmlTag(cleanDev, 'model', '未知型号');
  const firmware = extractXmlTag(cleanDev, 'firmwareVersion', '未知版本');

  if (mac && mac !== '未知') {
    mac = mac.trim().toLowerCase().replace(/-/g, ':');
  }

  const platformInfoList: string[] = [];
  let gbDetail: any = undefined;
  let ehomeDetail: any = undefined;
  let ezvizDetail: any = undefined;

  // 2.1 GB28181
  const gbXml = await fetchIsapiXml(ip, '/ISAPI/System/Network/sip', user, pwd, timeoutMs, maxAttempts);
  if (gbXml) {
    const cleanGb = cleanXml(gbXml);
    const enabled = extractXmlTag(cleanGb, 'enabled', 'false').toLowerCase();
    if (enabled === 'true') {
      const gbId = extractXmlTag(cleanGb, 'id', '');
      const gbIp =
        extractXmlTag(cleanGb, 'address') || extractXmlTag(cleanGb, 'ipAddress') || '';
      const gbPort =
        extractXmlTag(cleanGb, 'portNo') || extractXmlTag(cleanGb, 'port') || '5060';
      const rawStatus = (
        extractXmlTag(cleanGb, 'status') ||
        extractXmlTag(cleanGb, 'registerStatus') ||
        ''
      ).toLowerCase();

      let statusStr = '';
      if (['online', 'registered', '1', 'true'].includes(rawStatus)) {
        statusStr = '在线';
      } else if (['unregistered', 'notregistered', 'inactive'].includes(rawStatus)) {
        statusStr = '未注册';
      } else if (['offline', 'disconnected', '0', 'false'].includes(rawStatus)) {
        statusStr = '离线';
      } else {
        statusStr = rawStatus;
      }

      gbDetail = {
        enabled: true,
        id: gbId,
        sipIp: gbIp,
        sipPort: gbPort,
        status: statusStr,
        rawStatus,
      };

      const detailParts: string[] = [];
      if (statusStr) detailParts.push(statusStr);
      if (gbIp) detailParts.push(`${gbIp}:${gbPort}`);
      if (gbId) detailParts.push(`ID:${gbId}`);

      const paramStr = detailParts.length ? ` [${detailParts.join(' | ')}]` : '';
      platformInfoList.push(`GB28181(已开启)${paramStr}`);
    } else {
      platformInfoList.push('GB28181');
    }
  }

  // 2.2 EHome / ISUP
  const ehomeXml = await fetchIsapiXml(ip, '/ISAPI/System/Network/ehome', user, pwd, timeoutMs, maxAttempts);
  if (ehomeXml) {
    const cleanEh = cleanXml(ehomeXml);
    const enabled = extractXmlTag(cleanEh, 'enabled', 'false').toLowerCase();
    const ver = extractXmlTag(cleanEh, 'ehomeVersion', 'EHome/ISUP');
    if (enabled === 'true') {
      const ehIp =
        extractXmlTag(cleanEh, 'address') || extractXmlTag(cleanEh, 'ipAddress') || '';
      const ehPort =
        extractXmlTag(cleanEh, 'portNo') || extractXmlTag(cleanEh, 'port') || '';
      const rawStatus = (
        extractXmlTag(cleanEh, 'status') ||
        extractXmlTag(cleanEh, 'registerStatus') ||
        ''
      ).toLowerCase();

      let statusStr = '';
      if (['online', 'registered', '1', 'true'].includes(rawStatus)) {
        statusStr = '在线';
      } else if (['unregistered', 'notregistered', 'inactive'].includes(rawStatus)) {
        statusStr = '未注册';
      } else if (['offline', 'disconnected', '0', 'false'].includes(rawStatus)) {
        statusStr = '离线';
      } else {
        statusStr = rawStatus;
      }

      ehomeDetail = {
        enabled: true,
        version: ver,
        serverIp: ehIp,
        serverPort: ehPort,
        status: statusStr,
        rawStatus,
      };

      const detailParts: string[] = [];
      if (statusStr) detailParts.push(statusStr);
      if (ehIp) detailParts.push(`${ehIp}:${ehPort}`);

      const paramStr = detailParts.length ? ` [${detailParts.join(' | ')}]` : '';
      platformInfoList.push(`${ver}(已开启)${paramStr}`);
    } else {
      platformInfoList.push(ver);
    }
  }

  // 2.3 EZVIZ
  const ezvizXml = await fetchIsapiXml(ip, '/ISAPI/System/Network/EZVIZ', user, pwd, timeoutMs, maxAttempts);
  if (ezvizXml) {
    const cleanEz = cleanXml(ezvizXml);
    const enabled = extractXmlTag(cleanEz, 'enabled', 'false').toLowerCase();
    if (enabled === 'true') {
      const rawStatus = (
        extractXmlTag(cleanEz, 'status') ||
        extractXmlTag(cleanEz, 'registerStatus') ||
        ''
      ).toLowerCase();

      let statusStr = '';
      if (['online', 'registered', '1', 'true'].includes(rawStatus)) {
        statusStr = ' [在线]';
      } else if (['unregistered', 'notregistered', 'inactive'].includes(rawStatus)) {
        statusStr = ' [未注册]';
      } else if (['offline', 'disconnected', '0', 'false'].includes(rawStatus)) {
        statusStr = ' [离线]';
      } else {
        statusStr = rawStatus ? ` [${rawStatus}]` : '';
      }

      ezvizDetail = {
        enabled: true,
        status: statusStr.replace(/[\[\]]/g, '').trim(),
        rawStatus,
      };

      platformInfoList.push(`萤石云(已开启)${statusStr}`);
    } else {
      platformInfoList.push('萤石云');
    }
  }

  const platformSummary = platformInfoList.length
    ? platformInfoList.join(' ; ')
    : '未配置/不支持平台协议';

  return {
    id: `cam-${ip.replace(/\./g, '-')}`,
    ip,
    mac,
    name: devName,
    model,
    serial,
    firmware,
    platform: platformSummary,
    gb28181: gbDetail,
    ehome: ehomeDetail,
    ezviz: ezvizDetail,
    vendor: '安防监控设备',
    deviceType: 'IPC',
    channels: 1,
    riskLevel: 'low',
    riskIssues: [],
    rawXml: {
      deviceInfo: devXml,
      gbXml,
      ehomeXml,
      ezvizXml,
    },
    discoveredAt: new Date().toISOString(),
  };
}

// ============================================================
// Network Quality Test (MOS score) - 主动测试单个监控的网络质量
// ============================================================

interface PingResult {
  rtt: number;      // 往返时间 (ms)
  success: boolean;
  statusCode: number;
}

/**
 * 单次 HTTP 探测,测量到目标 IP 的 RTT。
 * 不带鉴权,用根路径 / ,目的是测网络层质量而非 ISAPI 业务性能。
 */
function pingOnce(ip: string, timeoutMs: number, useHttps = false): Promise<PingResult> {
  return new Promise((resolve) => {
    const proto = useHttps ? 'https' : 'http';
    const url = `${proto}://${ip}/`;
    const reqModule = useHttps ? https : http;
    const start = Date.now();

    const req = reqModule.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (TraeScan/Quality)' },
      timeout: timeoutMs,
      rejectUnauthorized: false, // 允许自签名证书
    }, (res) => {
      // 立刻消耗并丢弃数据,只关心 RTT 和状态码
      res.resume();
      res.on('end', () => {
        resolve({ rtt: Date.now() - start, success: true, statusCode: res.statusCode || 0 });
      });
      res.on('error', () => {
        resolve({ rtt: Date.now() - start, success: false, statusCode: 0 });
      });
    });

    req.on('error', () => resolve({ rtt: timeoutMs, success: false, statusCode: 0 }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ rtt: timeoutMs, success: false, statusCode: 0 });
    });
  });
}

/**
 * 计算网络质量 MOS 分。
 * 基于 ITU-T G.107 E-Model 简化版,适合视频监控场景:
 *   R = 93 - 0.024*latency - 0.11*jitter - 1.0*packetLossPct - 0.1*connectFailures
 *   MOS = 1 + 0.035*R + 0.000007*R*(R-60)*(100-R)
 * 值域: 1.0 (最差) ~ 4.5 (极佳,理想网络)
 */
function calcMos(latency: number, jitter: number, packetLossPct: number, failures: number): number {
  // 极端情况直接返回最低分
  if (latency >= 2000 || packetLossPct >= 100) return 1.0;

  const R = 93
    - 0.024 * Math.min(latency, 1000)
    - 0.11 * Math.min(jitter, 500)
    - 1.0 * Math.min(packetLossPct, 100)
    - 0.1 * Math.min(failures * 10, 30);

  const clampedR = Math.max(0, Math.min(100, R));
  let mos = 1 + 0.035 * clampedR + 0.000007 * clampedR * (clampedR - 60) * (100 - clampedR);
  return Math.max(1.0, Math.min(4.5, Math.round(mos * 100) / 100));
}

/** 把 MOS 分数转成评级 */
function mosGrade(mos: number): { grade: string; color: string; desc: string } {
  if (mos >= 4.0) return { grade: 'A', color: 'green',   desc: '优秀' };
  if (mos >= 3.5) return { grade: 'B', color: 'lime',    desc: '良好' };
  if (mos >= 3.0) return { grade: 'C', color: 'yellow',  desc: '一般' };
  if (mos >= 2.0) return { grade: 'D', color: 'orange', desc: '较差' };
  return { grade: 'F', color: 'red', desc: '极差' };
}

// API Routes

// 健康检查端点：用于诊断 server 是否可达
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Presets
app.get('/api/presets', (req, res) => {
  res.json({
    presets: [
      { name: '1号楼监控网段', network: '192.168.1.0/24', count: 254, desc: '主楼监控专网 (GB28181平台中心)' },
      { name: '地下车库与园区专网', network: '10.10.10.1-60', count: 60, desc: '车辆出入口与高空抛物摄像头' },
      { name: '核心机房与周界安防', network: '172.16.100.1-30', count: 30, desc: '热成像与NVR存储集群' },
    ],
  });
});

// SSE Streaming Scan Endpoint
app.post('/api/scan', async (req, res) => {
  const { ipList, user, pwd, maxThreads = 20, timeoutMs = 2000, excludeList = [], scanAttempts = 1 } = req.body;

  // Defensive: if excludeList provided, remove those IPs from the ipList
  let normalizedIpList = Array.isArray(ipList) ? [...ipList] : [];
  if (Array.isArray(excludeList) && excludeList.length > 0) {
    const excl = new Set(excludeList.map((e: any) => String(e).trim()));
    normalizedIpList = normalizedIpList.filter((ip) => !excl.has(ip));
  }

  if (!Array.isArray(normalizedIpList) || normalizedIpList.length === 0) {
    console.log('[scan] rejected: empty IP list');
    return res.status(400).json({ error: 'IP 列表不能为空（或排除后为空）' });
  }

  console.log(`[scan] start: total=${normalizedIpList.length} user=${user} timeout=${timeoutMs}ms attempts=${scanAttempts} threads=${maxThreads}`);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const total = normalizedIpList.length;
  let completed = 0;
  let successCount = 0;
  let errorCount = 0;

  // Process in batches matching concurrency limit
  const chunkSize = Math.max(1, Math.min(maxThreads, 30));

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = normalizedIpList.slice(i, i + chunkSize);
    const promises = chunk.map(async (ip) => {
      try {
        const result = await scanSingleIp(ip, user, pwd, timeoutMs, scanAttempts);
        completed++;
        if (result) {
          successCount++;
          console.log(`[scan] HIT  ${ip} -> ${result.name} (${result.model})`);
          res.write(
            `data: ${JSON.stringify({
              type: 'result',
              completed,
              total,
              successCount,
              currentIp: ip,
              asset: result,
            })}\n\n`
          );
        } else {
          res.write(
            `data: ${JSON.stringify({
              type: 'progress',
              completed,
              total,
              successCount,
              currentIp: ip,
            })}\n\n`
          );
        }
      } catch (err) {
        completed++;
        errorCount++;
        console.log(`[scan] ERR  ${ip} -> ${err && err.message ? err.message : err}`);
        res.write(
          `data: ${JSON.stringify({
            type: 'progress',
            completed,
            total,
            successCount,
            currentIp: ip,
          })}\n\n`
        );
      }
    });

    await Promise.all(promises);
    // Small pause between chunks to give smooth UI animation & prevent thread flooding
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`[scan] finished: total=${total} hit=${successCount} err=${errorCount}`);
  res.write(
    `data: ${JSON.stringify({
      type: 'finished',
      completed,
      total,
      successCount,
    })}\n\n`
  );
  res.end();
});

// 网络质量测试端点 (MOS 评分)
// 主动测试单个监控设备的网络质量,不影响扫描流程
app.post('/api/quality-test', async (req, res) => {
  const { ip, user, pwd, timeoutMs = 3000, samples = 8 } = req.body;
  if (!ip) {
    return res.status(400).json({ error: '缺少 ip 参数' });
  }
  console.log(`[quality] start ip=${ip} user=${user} samples=${samples} timeout=${timeoutMs}`);

  // 探测目标:先试 HTTP 根路径,失败改 HTTPS
  const probe = await pingOnce(ip, Math.min(timeoutMs, 2000), false);
  let useHttps = false;
  if (!probe.success || probe.statusCode === 0) {
    const httpsProbe = await pingOnce(ip, Math.min(timeoutMs, 2000), true);
    if (httpsProbe.success || httpsProbe.statusCode > 0) useHttps = true;
  }

  // 多次探测采集 RTT 序列
  const results: PingResult[] = [];
  for (let i = 0; i < samples; i++) {
    results.push(await pingOnce(ip, timeoutMs, useHttps));
  }

  const successes = results.filter((r) => r.success);
  const failures = results.length - successes.length;
  const rtts = successes.map((r) => r.rtt);

  // 延迟(平均)、抖动(标准差)、丢包率
  const latency = rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : timeoutMs;
  const mean = latency;
  const jitter = rtts.length > 1
    ? Math.sqrt(rtts.reduce((sum, r) => sum + (r - mean) ** 2, 0) / rtts.length)
    : 0;
  const packetLossPct = (failures / results.length) * 100;

  const mos = calcMos(latency, jitter, packetLossPct, failures);
  const grade = mosGrade(mos);

  // 最小/最大 RTT 用于详情展示
  const minRtt = rtts.length > 0 ? Math.min(...rtts) : 0;
  const maxRtt = rtts.length > 0 ? Math.max(...rtts) : 0;

  // 连接类型判定
  let connectionType = 'unknown';
  if (useHttps) connectionType = 'HTTPS (443)';
  else if (probe.statusCode === 401) connectionType = 'HTTP (80, 需鉴权)';
  else if (probe.success) connectionType = `HTTP (80, ${probe.statusCode})`;
  else connectionType = '不可达';

  const payload = {
    ip,
    mos,
    grade: grade.grade,
    gradeDesc: grade.desc,
    color: grade.color,
    latency: Math.round(latency * 10) / 10,
    jitter: Math.round(jitter * 10) / 10,
    packetLossPct: Math.round(packetLossPct * 10) / 10,
    samples: results.length,
    successes: successes.length,
    failures,
    minRtt: Math.round(minRtt),
    maxRtt: Math.round(maxRtt),
    connectionType,
    testedAt: new Date().toISOString(),
  };

  console.log(`[quality] done ip=${ip} mos=${mos} grade=${grade.grade} latency=${latency.toFixed(1)}ms jitter=${jitter.toFixed(1)}ms loss=${packetLossPct.toFixed(1)}%`);
  res.json(payload);
});

// AI Gemini Security Audit Endpoint
app.post('/api/ai-diagnose', async (req, res) => {
  try {
    const { assets } = req.body;
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: '请提供待诊断的安防资产列表' });
    }

    const ai = getGenAI();

    const assetSummary = assets.slice(0, 10).map((a: any) => ({
      ip: a.ip,
      mac: a.mac,
      model: a.model,
      firmware: a.firmware,
      platform: a.platform,
      riskIssues: a.riskIssues,
    }));

    const prompt = `
你是一位专业的安防监控网络安全专家，请针对以下扫描发现的安防监控摄像头及存储设备（ISAPI/GB28181/EHome/ISUP/萤石云资产）进行深度安全评估：

设备摘要数据：
${JSON.stringify(assetSummary, null, 2)}

请分析这些设备在 GB28181 国标注册、ISUP 接入、默认口令防护、固件漏洞CVE、以及网络暴露面方面的风险，并以 JSON 格式输出评估报告，结构如下：
{
  "summary": "一句高度精炼的安全态势评估总结",
  "securityScore": 78, // 0 - 100 综合安全得分
  "vulnerabilities": [
    {
      "severity": "high", // "critical" | "high" | "medium" | "low"
      "title": "漏洞风险标题",
      "description": "详细描述风险影响",
      "remediation": "具体修复整改建议"
    }
  ],
  "complianceChecks": [
    {
      "standard": "GB28181-2016 规范合规",
      "status": "pass", // "pass" | "fail" | "warning"
      "details": "国标 SIP 鉴权配置情况说明"
    }
  ],
  "recommendations": [
    "针对性安全加固建议1",
    "建议2"
  ]
}
只返回纯 JSON，不要 markdown 标记以外的文本。
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const rawText = response.text || '';
    const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    const auditData = JSON.parse(cleanedJson);
    res.json({ success: true, result: auditData });
  } catch (err: any) {
    console.error('AI Diagnose Error:', err);
    res.status(500).json({
      error: 'AI 诊断失败',
      message: err?.message || '生成报告时出错',
    });
  }
});

// Start Express + Vite
async function main() {
  if (process.env.NODE_ENV !== 'production') {
    // 开发模式：动态加载 vite，避免生产模式被无谓加载拖慢启动
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // 生产模式：dist/index.html 与 server.cjs 同目录，用 __dirname 定位
    // （不能用 process.cwd()，打包后 cwd 是用户启动 exe 时的目录，找不到资源）
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

main();
