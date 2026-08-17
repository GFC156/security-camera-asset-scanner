import { CameraAsset } from '../types';

export interface ProtocolInfo {
  gb28181: { enabled: boolean; status: string };
  ehome: { enabled: boolean; status: string };
  ezviz: { enabled: boolean; status: string };
}

/**
 * 统一解析资产的协议信息。
 * 优先使用结构化字段 (gb28181/ehome/ezviz)，若缺失则从 platform 字符串解析。
 * 保证 StatsOverview 和 AssetTable 计数/过滤口径一致。
 */
export function parsePlatformInfo(asset: CameraAsset): ProtocolInfo {
  const result: ProtocolInfo = {
    gb28181: { enabled: false, status: '' },
    ehome: { enabled: false, status: '' },
    ezviz: { enabled: false, status: '' },
  };

  // 1. 优先用结构化字段
  if (asset.gb28181?.enabled) {
    result.gb28181.enabled = true;
    result.gb28181.status = asset.gb28181.status || '';
  }
  if (asset.ehome?.enabled) {
    result.ehome.enabled = true;
    result.ehome.status = asset.ehome.status || '';
  }
  if (asset.ezviz?.enabled) {
    result.ezviz.enabled = true;
    result.ezviz.status = asset.ezviz.status || '';
  }

  // 2. 如果结构化字段都不可用，从 platform 字符串解析
  const p = asset.platform || '';
  if (!result.gb28181.enabled && p.includes('GB28181')) {
    result.gb28181.enabled = true;
    if (p.includes('GB28181(已开启)') || p.match(/GB28181.*已开启/)) {
      result.gb28181.status = extractStatus(p, 'GB28181') || '';
    }
  }
  if (!result.ehome.enabled && (p.includes('EHome') || p.includes('ISUP'))) {
    result.ehome.enabled = true;
    if (p.match(/EHome.*已开启/) || p.match(/ISUP.*已开启/)) {
      result.ehome.status = extractStatus(p, 'EHome') || '';
    }
  }
  if (!result.ezviz.enabled && p.includes('萤石云')) {
    result.ezviz.enabled = true;
    if (p.match(/萤石云.*已开启/)) {
      result.ezviz.status = extractStatus(p, '萤石云') || '';
    }
  }

  return result;
}

function extractStatus(platformStr: string, prefix: string): string {
  const seg = platformStr.split(' ; ').find((s) => s.includes(prefix));
  if (!seg) return '';
  if (seg.includes('在线')) return '在线';
  if (seg.includes('未注册')) return '未注册';
  if (seg.includes('离线')) return '离线';
  return '';
}

/** 统计在线(含任意状态)的设备数 */
export function countEnabled(assets: CameraAsset[]) {
  let gb = 0, eh = 0, ez = 0;
  for (const a of assets) {
    const info = parsePlatformInfo(a);
    if (info.gb28181.enabled) gb++;
    if (info.ehome.enabled) eh++;
    if (info.ezviz.enabled) ez++;
  }
  return { gb, eh, ez };
}

/** 统计"在线"状态的设备数 */
export function countOnline(assets: CameraAsset[]) {
  let gb = 0, eh = 0, ez = 0;
  for (const a of assets) {
    const info = parsePlatformInfo(a);
    if (info.gb28181.status === '在线') gb++;
    if (info.ehome.status === '在线') eh++;
    if (info.ezviz.status === '在线') ez++;
  }
  return { gb, eh, ez };
}

/** 过滤函数:用于 AssetTable 的协议筛选 */
export function matchesProtocolFilter(asset: CameraAsset, filter: string): boolean {
  const info = parsePlatformInfo(asset);
  switch (filter) {
    case 'all':
      return true;
    case 'gb28181':
      return info.gb28181.enabled;
    case 'ehome':
      return info.ehome.enabled;
    case 'ezviz':
      return info.ezviz.enabled;
    default:
      return true;
  }
}
