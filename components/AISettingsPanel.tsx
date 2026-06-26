'use client';
import { useEffect, useState } from 'react';

interface AIConfig {
  provider: string;
  api_key_masked: string;
  key_length: number;
  model: string;
  base_url: string;
  is_active: number;
  updated_by: string;
  updated_at: string;
}

const PROVIDERS = [
  {
    key: 'gemini',
    label: 'Google Gemini',
    icon: '🔷',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'AIza...',
    note: 'Gemini 2.0 Flash hoàn toàn miễn phí. Không cần thẻ tín dụng.',
    color: 'border-blue-200 bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-700',
    requiresBaseUrl: false,
  },
  {
    key: 'claude',
    label: 'Anthropic Claude',
    icon: '🟠',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-8'],
    defaultModel: 'claude-haiku-4-5-20251001',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'sk-ant-api...',
    note: 'Claude Haiku là model nhanh và rẻ nhất của Anthropic. Cần tài khoản trả phí.',
    color: 'border-orange-200 bg-orange-50',
    badgeColor: 'bg-orange-100 text-orange-700',
    requiresBaseUrl: true,
    baseUrlPlaceholder: 'https://api.anthropic.com (mặc định)',
  },
  {
    key: 'openai',
    label: 'OpenAI / Custom',
    icon: '⚡',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'sk-...',
    note: 'Tương thích OpenAI API. Cũng dùng được với các proxy/self-host (LM Studio, Ollama, v.v.).',
    color: 'border-green-200 bg-green-50',
    badgeColor: 'bg-green-100 text-green-700',
    requiresBaseUrl: true,
    baseUrlPlaceholder: 'https://api.openai.com (hoặc URL proxy của bạn)',
  },
];

export default function AISettingsPanel({ updatedBy }: { updatedBy: string }) {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [baseUrl, setBaseUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch('/api/ai-settings').then(r => r.json()).then((d: AIConfig | null) => {
      if (d) {
        setConfig(d);
        setProvider(d.provider || 'gemini');
        setModel(d.model || 'gemini-2.0-flash');
        setBaseUrl(d.base_url || '');
      }
    });
  }, []);

  const currentProvider = PROVIDERS.find(p => p.key === provider) || PROVIDERS[0];

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const pMeta = PROVIDERS.find(x => x.key === p)!;
    setModel(pMeta.defaultModel);
    setBaseUrl('');
    setApiKey('');
    setTestResult(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) { setError('Vui lòng nhập API Key'); return; }
    setSaving(true); setError(''); setSaved(false);
    const res = await fetch('/api/ai-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider, api_key: apiKey,
        model: customModel || model,
        base_url: baseUrl,
        updated_by: updatedBy,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setSaved(true);
    setApiKey('');
    // Refresh config
    fetch('/api/ai-settings').then(r => r.json()).then(setConfig);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'general',
          context: { prompt: 'Trả lời đúng 1 câu: "AI đã kết nối thành công!" (không thêm gì khác)' },
        }),
      });
      const data = await res.json();
      if (!res.ok) setTestResult({ ok: false, message: data.error });
      else setTestResult({ ok: true, message: data.result || 'OK' });
    } catch {
      setTestResult({ ok: false, message: 'Không kết nối được' });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-5">
      {/* Current status */}
      <div className={`rounded-xl border p-4 ${config?.is_active && config.key_length > 0 ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              {config?.key_length ? (
                <><span className="text-green-600">●</span> AI đã được cấu hình</>
              ) : (
                <><span className="text-slate-400">○</span> Chưa cấu hình AI</>
              )}
            </div>
            {config?.key_length ? (
              <div className="text-sm text-slate-500 mt-0.5">
                Provider: <strong>{config.provider}</strong> · Model: <strong>{config.model}</strong> · Key: <code className="bg-white px-1 rounded">{config.api_key_masked}</code>
                <span className="ml-2 text-xs text-slate-400">Cập nhật bởi {config.updated_by} · {config.updated_at}</span>
              </div>
            ) : (
              <div className="text-sm text-slate-400 mt-0.5">Thêm API Key để bật tính năng gợi ý AI</div>
            )}
          </div>
          {config?.key_length ? (
            <button onClick={handleTest} disabled={testing}
              className="flex items-center gap-1.5 border border-green-300 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50">
              {testing ? '⏳ Đang test...' : '🧪 Test kết nối'}
            </button>
          ) : null}
        </div>
        {testResult && (
          <div className={`mt-2 text-xs rounded-lg px-3 py-2 ${testResult.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {testResult.ok ? '✅ ' : '❌ '}{testResult.message}
          </div>
        )}
      </div>

      {/* Provider selection */}
      <div>
        <div className="text-sm font-bold text-slate-700 mb-3">Chọn AI Provider</div>
        <div className="grid grid-cols-3 gap-3">
          {PROVIDERS.map(p => (
            <button key={p.key} type="button" onClick={() => handleProviderChange(p.key)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                provider === p.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{p.icon}</span>
                <span className="font-semibold text-sm text-slate-800">{p.label}</span>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${p.badgeColor}`}>
                {p.key === 'gemini' ? 'Miễn phí' : p.key === 'claude' ? 'Trả phí' : 'Custom'}
              </span>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{p.note}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Config form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span>{currentProvider.icon}</span> Cấu hình {currentProvider.label}
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            API Key <span className="text-red-500">*</span>
            <a href={currentProvider.keyUrl} target="_blank" rel="noopener noreferrer"
              className="ml-2 text-xs text-blue-500 hover:underline font-normal">
              Lấy API Key →
            </a>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={config?.key_length ? `Nhập key mới để thay thế (hiện có: ${config.api_key_masked})` : currentProvider.keyHint}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-mono"
            />
            <button type="button" onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs">
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Key được lưu trong database nội bộ (không gửi ra ngoài trừ khi gọi AI).</p>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            {currentProvider.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
            <option value="__custom__">Tùy chỉnh (nhập tên model)</option>
          </select>
          {model === '__custom__' && (
            <input type="text" value={customModel} onChange={e => setCustomModel(e.target.value)}
              placeholder="Nhập tên model chính xác (VD: gemini-exp-1206)"
              className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
          )}
        </div>

        {/* Base URL (for Claude/OpenAI) */}
        {currentProvider.requiresBaseUrl && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Base URL <span className="text-slate-400 font-normal">(tùy chọn — để trống dùng URL mặc định)</span>
            </label>
            <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
              placeholder={currentProvider.baseUrlPlaceholder || ''}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">
              Dùng để thay thế endpoint khi sử dụng proxy, self-hosted (LM Studio, Ollama, v.v.).
            </p>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        {saved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">✅ Đã lưu cấu hình AI thành công!</div>}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm disabled:opacity-50">
            {saving ? 'Đang lưu...' : '💾 Lưu cấu hình'}
          </button>
          {config?.key_length ? (
            <button type="button" onClick={handleTest} disabled={testing}
              className="border border-slate-300 text-slate-700 font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
              {testing ? '⏳ Đang test...' : '🧪 Test ngay'}
            </button>
          ) : null}
        </div>
      </form>

      {/* Usage guide */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="font-semibold text-violet-800 mb-2 flex items-center gap-2"><span>✨</span> Tính năng AI hỗ trợ</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-violet-700">
          {[
            ['📝 Bước 1', 'Gợi ý các bước quy trình và pain points dựa trên mô tả'],
            ['💬 Bước 2', 'Tạo bộ câu hỏi phỏng vấn đủ 4 loại (Normal/Edge/Exception/Approval)'],
            ['👁️ Bước 3', 'Gợi ý danh sách hành động cần quan sát khi shadowing'],
            ['🔍 Phân tích', 'Tự động điền 5W1H từ dữ liệu khảo sát đã thu thập'],
            ['📌 Backlog', 'Viết User Story + Acceptance Criteria từ kết quả phân tích'],
            ['📋 Chung', 'Hỏi AI bất kỳ câu hỏi nghiệp vụ trong context dự án'],
          ].map(([label, desc]) => (
            <div key={label} className="flex items-start gap-2">
              <span className="font-semibold shrink-0">{label}:</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
