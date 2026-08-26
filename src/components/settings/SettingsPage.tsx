import DataSourceSelect from './DataSourceSelect';
import OxfordApiConfig from './OxfordApiConfig';
import LlmApiConfig from './LlmApiConfig';
import TargetCorrectSlider from './TargetCorrectSlider';
import DangerZone from './DangerZone';

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stroke bg-surface p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {desc && <p className="text-sm text-ink-muted mt-1">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">设置</h1>
        <p className="text-sm text-ink-muted mt-1">
          所有设置和数据都保存在你本地浏览器，不会上传服务器。
        </p>
      </div>
      <Section
        title="数据源"
        desc="优先使用官方牛津 API 时准确性最高；未配置或失败时自动回落 LLM（兜底）。"
      >
        <DataSourceSelect />
      </Section>
      <Section
        title="Oxford Dictionaries API"
        desc="官方 API 每日有免费额度；开发期已通过 Vite dev server 的 /oxford 代理解决 CORS。"
      >
        <OxfordApiConfig />
      </Section>
      <Section
        title="LLM（必配）"
        desc="用于兜底的牛津释义和中文翻译，以及 100% 的语义判定。需要兼容 OpenAI Chat Completions 格式。"
      >
        <LlmApiConfig />
      </Section>
      <Section title="错题库阈值">
        <TargetCorrectSlider />
      </Section>
      <Section title="数据管理">
        <DangerZone />
      </Section>
    </div>
  );
}
