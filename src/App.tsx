import { useState } from 'react';
import NavBar from '@/components/layout/NavBar';
import LookupPage from '@/components/lookup/LookupPage';
import WordBankPage from '@/components/wrong-bank/WrongBankPage';
import WordBookPage from '@/components/word-book/WordBookPage';
import SettingsPage from '@/components/settings/SettingsPage';
import FirstRunGuide from '@/components/layout/FirstRunGuide';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/utils/cn';

type Tab = 'lookup' | 'wordbank' | 'wordbook' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('lookup');
  const settings = useAppStore((s) => s.settings);
  const needGuide = tab === 'lookup' && !settings.llmApiKey.trim();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      <NavBar active={tab} onChange={setTab} />
      <main
        className={cn(
          'flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 max-w-7xl',
          'md:pb-6',
          'pb-[calc(4rem+0.75rem+env(safe-area-inset-bottom,0px))]', // leave space for bottom nav bar
        )}
      >
        {needGuide && <FirstRunGuide onSetup={() => setTab('settings')} />}
        <div key={tab} className="animate-fadeIn">
          {tab === 'lookup' && <LookupPage />}
          {tab === 'wordbank' && <WordBankPage />}
          {tab === 'wordbook' && <WordBookPage />}
          {tab === 'settings' && <SettingsPage />}
        </div>
      </main>
      <footer className="hidden md:block py-6 text-center text-sm text-ink-muted">
        🔁 RecurWords · 用英文解释英文，递归理解直至掌握 · 本地存储，数据隐私
      </footer>
    </div>
  );
}
