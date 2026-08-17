import { CameraAsset } from '../types';

export const TABLE_HEADERS = [
  'IP 地址',
  '物理 MAC 地址',
  '设备名称',
  '设备型号',
  '硬件序列号',
  '固件版本',
  '平台接入状态与详细参数',
];

/**
 * Export scanned camera assets to a CSV file with UTF-8 BOM for Microsoft Excel compatibility.
 */
export function exportToCSV(assets: CameraAsset[], filename = '监控全量资产清单.csv') {
  if (!assets.length) return;

  const rows = [
    TABLE_HEADERS.map((h) => `"${h.replace(/"/g, '""')}"`),
    ...assets.map((asset) => [
      `"${(asset.ip || '').replace(/"/g, '""')}"`,
      `"${(asset.mac || '').replace(/"/g, '""')}"`,
      `"${(asset.name || '').replace(/"/g, '""')}"`,
      `"${(asset.model || '').replace(/"/g, '""')}"`,
      `"${(asset.serial || '').replace(/"/g, '""')}"`,
      `"${(asset.firmware || '').replace(/"/g, '""')}"`,
      `"${(asset.platform || '').replace(/"/g, '""')}"`,
    ]),
  ];

  const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export scanned assets to formatted JSON file.
 */
export function exportToJSON(assets: CameraAsset[], filename = '监控资产清单.json') {
  if (!assets.length) return;

  const jsonContent = JSON.stringify(assets, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
