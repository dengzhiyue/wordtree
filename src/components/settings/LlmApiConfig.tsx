import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { llmPing } from '@/services/llmClient';
import { Check, Loader2, X, Eye, EyeOff, Sparkles } from 'lucide-react';

type PingState = { ok: true } | { ok: false; reason: string } | null;

interface ProviderPreset {
  name: string;
  baseUrl: string;
  model: string;
  note: string;
}

const PRESETS: ProviderPreset[] = [
  { name: 'DeepSeek（推荐·最便宜）', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', note: '¥1/百万token，新用户送额度' },
  { name: 'Kimi / 月之暗面（国内）', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', note: '新用户送¥60' },
  { name: 'Kimi / Moonshot（全球）', baseUrl: 'https://api.moonshot.ai/v1', model: 'moonshot-v1-8k', note: '新官方全球域名' },
  { name: '零一万物 Yi', baseUrl: 'https://api.lingyiwanwu.com/v1', model: 'yi-large', note: '新用户送¥20' },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', note: '需翻墙' },
  { name: 'Ollama 本地', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:3b', note: '本地运行，完全免费' },
];

export default function LlmApiConfig() {
  const s = useAppStore((st) => st.settings);
  const set = useAppStore((st) => st.setSettings);
  const [showK, setShowK] = useState(false);
  const [testing, setTesting] = useState(false);
  const [state, setState] = useState<PingState>(null);

  const applyPreset = (p: ProviderPreset) => {
    set({ llmBaseUrl: p.baseUrl, llmModel: p.model });
  };

  const test = async () => {
    setTesting(true);
    setState(null);
    try {
      const ok = await llmPing(s);
      setState(ok ? { ok: true } : { ok: false, reason: 'LLM 返回了空内容，请检查模型名是否正确。' });
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      let reason = msg;
      if (msg.includes('HTTP 401')) reason = '❌ API Key 无效（401）：请核对 Key 是否完整复制、前后无空格，且未被删除或泄漏禁用。';
      else if (msg.includes('HTTP 403')) reason = '❌ 被拒绝访问（403）：请检查 API Key 是否属于当前组织，或账号是否已完成身份验证。';
      else if (msg.includes('HTTP 429')) reason = '⏳ 请求过于频繁（429）：请稍后重试，或在控制台提高并发限制。';
      else if (msg.includes('HTTP 404')) reason = '❌ 路径/模型不存在（404）：请核对 Base URL 结尾是否为 /v1，或模型名是否拼写正确（如 moonshot-v1-8k）。';
      else if (msg.includes('AbortError') || msg.includes('timeout')) reason = '⏱ 超时（45s 未返回）：请检查当前网络能否访问 Base URL，或关闭 VPN/代理后再试。';
      else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) reason = '🌐 网络不通：请关闭 VPN/代理，切换 Wi-Fi 或 5G 后重试；或用手机浏览器访问 Base URL 看能否打开。';
      setState({ ok: false, reason });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-brand" />
        <span className="text-xs text-ink-muted">快速选择服务商（自动填充 Base URL 和模型）：</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const isActive = s.llmBaseUrl === p.baseUrl;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              title={p.note}
              className={`px-3 py-1.5 rounded-full text-xs border transition touch-target ${
                isActive
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface border-stroke text-ink-muted hover:border-brand hover:text-ink'
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 mt-2">
        <label className="block">
          <span className="text-sm text-ink-muted">Base URL</span>
          <input
            value={s.llmBaseUrl}
            onChange={(e) => set({ llmBaseUrl: e.target.value })}
            className="mt-1 w-full h-12 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
            placeholder="https://api.openai.com/v1"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">模型</span>
          <input
            value={s.llmModel}
            onChange={(e) => set({ llmModel: e.target.value })}
            className="mt-1 w-full h-12 px-3 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
            placeholder="gpt-4o-mini"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-muted">API Key</span>
          <div className="relative mt-1">
            <input
              value={s.llmApiKey}
              onChange={(e) => set({ llmApiKey: e.target.value })}
              type={showK ? 'text' : 'password'}
              className="w-full h-12 px-3 pr-11 rounded-lg bg-surface border border-stroke text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 text-base"
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowK((x) => !x)}
              className="absolute right-2 top-1/2 -translate-y-1/2 touch-target p-2 rounded hover:bg-surface-muted text-ink-muted inline-flex items-center justify-center"
            >
              {showK ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={test}
          disabled={testing || !s.llmApiKey.trim() || !s.llmBaseUrl.trim()}
          className="h-12 px-5 rounded-md bg-brand text-white disabled:opacity-60 hover:opacity-90 transition inline-flex items-center gap-2 touch-target"
        >
          {testing ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 测试连接中…
            </>
          ) : (
            '测试连接'
          )}
        </button>
        {state?.ok === true && (
          <span className="inline-flex items-center gap-1 text-success">
            <Check size={18} /> 连接正常
          </span>
        )}
        {state?.ok === false && (
          <div className="w-full">
            <div className="flex items-start gap-1 text-danger">
              <X size={18} className="shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap break-words text-sm leading-6">{state.reason}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
