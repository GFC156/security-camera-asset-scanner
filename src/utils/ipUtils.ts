/**
 * Utility functions for IP address parsing, CIDR subnet expansion, and IP ranges.
 */

export function parseIpInput(networkStr: string): string[] {
  const trimmed = networkStr.trim();
  if (!trimmed) return [];

  const results: Set<string> = new Set();
  // Support comma or whitespace separated tokens
  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);

  for (const token of tokens) {
    try {
      if (token.includes('/')) {
        // CIDR notation like 192.168.1.0/24
        const ips = expandCIDR(token);
        ips.forEach((ip) => results.add(ip));
      } else if (token.includes('-')) {
        // Range notation like 192.168.1.1-50 or 192.168.1.1-192.168.1.50
        const ips = expandRange(token);
        ips.forEach((ip) => results.add(ip));
      } else if (isValidIPv4(token)) {
        results.add(token);
      }
    } catch {
      // Continue parsing other tokens if one fails
    }
  }

  return Array.from(results);
}

export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const num = Number(p);
    return !isNaN(num) && num >= 0 && num <= 255 && p === String(num);
  });
}

function ipToLong(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join('.');
}

function expandCIDR(cidr: string): string[] {
  const [ipStr, prefixStr] = cidr.split('/');
  if (!isValidIPv4(ipStr)) return [];
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return [];

  // Cap max hosts per request to 1024 to prevent memory / execution lockups
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const ipLong = ipToLong(ipStr);
  const networkLong = (ipLong & mask) >>> 0;
  const broadcastLong = (networkLong | ~mask) >>> 0;

  // Host range
  let start = networkLong;
  let end = broadcastLong;

  if (prefix < 31) {
    start += 1; // skip network address
    end -= 1; // skip broadcast address
  }

  const limit = Math.min(end - start + 1, 1024); // max 1024 IPs per scan batch
  const ips: string[] = [];
  for (let i = 0; i < limit; i++) {
    ips.push(longToIp(start + i));
  }
  return ips;
}

function expandRange(rangeStr: string): string[] {
  const [startPart, endPart] = rangeStr.split('-');
  if (!isValidIPv4(startPart)) return [];

  let startIp = startPart;
  let endIp = endPart;

  // If endPart is just a number (e.g. 192.168.1.10 - 25)
  if (!endPart.includes('.')) {
    const lastDotIndex = startPart.lastIndexOf('.');
    const prefix = startPart.substring(0, lastDotIndex);
    endIp = `${prefix}.${endPart}`;
  }

  if (!isValidIPv4(endIp)) return [];

  const startLong = ipToLong(startIp);
  const endLong = ipToLong(endIp);

  if (startLong > endLong) return [];

  const count = Math.min(endLong - startLong + 1, 1024);
  const ips: string[] = [];
  for (let i = 0; i < count; i++) {
    ips.push(longToIp(startLong + i));
  }
  return ips;
}
