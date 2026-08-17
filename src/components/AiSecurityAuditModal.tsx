import React, { useState, useEffect } from 'react';
import { CameraAsset, AiDiagnosisResult } from '../types';
import {
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Award,
} from 'lucide-react';

interface AiSecurityAuditModalProps {
  assets: CameraAsset[];
  isOpen: boolean;
  onClose: () => void;
}

export const AiSecurityAuditModal: React.FC<AiSecurityAuditModalProps> = ({
  assets,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiDiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!assets.length) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setResult(data.result);
      } else {
        setError(data.error || 'AI 诊断评估失败');
      }
    } catch (err: any) {
      setError(err?.message || '请求服务器失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && assets.length > 0 && !result && !loading) {
      runAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#E4E3E0] border-2 border-[#141414] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#141414]">
        {/* Header */}
        <div className="p-4 bg-[#141414] text-[#E4E3E0] border-b border-[#141414] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#E4E3E0] text-[#141414] border border-[#E4E3E0]">
              <Sparkles className="w-5 h-5 text-[#141414]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E4E3E0] flex items-center space-x-2">
                <span>Gemini AI 安防网络安全态势报告</span>
              </h3>
              <p className="text-xs text-[#DCDAD7]/80 font-mono-tech">
                基于 {assets.length} 台识别资产的 ISAPI / GB28181 协议特征智能分析
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 font-mono-tech">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#141414] animate-spin mx-auto" />
              <div className="text-sm font-bold text-[#141414] uppercase">
                AI 正在全盘分析摄像头协议配置与已知漏洞...
              </div>
              <div className="text-xs text-[#141414]/70">
                正在评估 GB28181 SIP 鉴权、ISUP 服务端暴露面与弱口令风险
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#DCDAD7] border border-[#141414] text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-[#141414] mx-auto" />
              <div className="text-xs font-bold text-[#141414]">{error}</div>
              <button
                onClick={runAudit}
                className="mt-2 px-3 py-1 bg-[#141414] text-[#E4E3E0] border border-[#141414] text-xs font-bold uppercase hover:bg-black cursor-pointer"
              >
                重试 AI 诊断
              </button>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Summary Score Header */}
              <div className="p-4 bg-[#DCDAD7] border border-[#141414] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-[#141414]/70 uppercase font-bold">总体安全态势评估</div>
                  <div className="text-sm font-bold text-[#141414]">
                    {result.summary}
                  </div>
                </div>

                <div className="text-center pl-4 border-l border-[#141414]">
                  <div className="text-[10px] text-[#141414]/70 uppercase font-bold">安全综合得分</div>
                  <div className="text-2xl font-bold font-mono-tech text-[#141414]">
                    {result.securityScore}
                  </div>
                </div>
              </div>

              {/* Vulnerabilities Section */}
              {result.vulnerabilities && result.vulnerabilities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-[#141414] tracking-wider">
                    排查出的风险漏洞与隐患
                  </h4>
                  <div className="space-y-2">
                    {result.vulnerabilities.map((v, i) => (
                      <div
                        key={i}
                        className="p-3 bg-[#DCDAD7] border border-[#141414] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#141414]">{v.title}</span>
                          <span className="px-1.5 py-0.5 border border-[#141414] bg-[#141414] text-[#E4E3E0] text-[10px] font-bold uppercase">
                            {v.severity}
                          </span>
                        </div>
                        <p className="text-[#141414]/80">{v.description}</p>
                        <div className="text-[#141414] font-bold text-[11px] pt-1">
                          💡 修复方案: {v.remediation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-4 bg-[#DCDAD7] border border-[#141414] space-y-2">
                  <h4 className="text-xs font-bold uppercase text-[#141414]">
                    专家加固建议清单
                  </h4>
                  <ul className="text-xs text-[#141414] space-y-1.5 pl-5 list-disc font-bold">
                    {result.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#DCDAD7] border-t border-[#141414] flex justify-between items-center">
          <button
            onClick={runAudit}
            disabled={loading}
            className="px-3 py-1.5 bg-[#141414] text-[#E4E3E0] border border-[#141414] text-xs font-mono-tech font-bold uppercase hover:bg-black cursor-pointer"
          >
            重新评估
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141414] text-[#E4E3E0] border border-[#141414] text-xs font-mono-tech font-bold uppercase hover:bg-black cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
