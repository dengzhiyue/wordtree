import { BookOpen, Bug, Settings, Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/useAppStore';

type Props = {
  active: 'lookup' | 'wrong' | 'settings';
  onChange: (t: 'lookup' | 'wrong' | 'settings') => void;
};

const tabs = [
  { id: 'lookup' as const, label: '查单词', icon: BookOpen },
  { id: 'wrong' as const, label: '错题库', icon: Bug },
  { id: 'settings' as const, label: '设置', icon: Settings },
];

export default function NavBar({ active, onChange }: Props) {
  const theme = useAppStore((s) => s.settings.theme);
  const set = useAppStore((s) => s.setSettings);
  const cycleTheme = () => {
    const n: Record<typeof theme, typeof theme> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    set({ theme: n[theme] });
  };
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur border-b border-stroke">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-16 flex items-center gap-4 pt-safe-top">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <span className="text-xl">🔁</span>
            <span className="md:inline">RecurWords</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={cn(
                  'touch-target px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition',
                  active === id
                    ? 'text-brand bg-brand-soft'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted',
                )}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={cycleTheme}
              title={`主题：${theme}`}
              className="touch-target p-2 rounded-md text-ink-muted hover:text-ink hover:bg-surface-muted transition inline-flex items-center justify-center"
            >
              <ThemeIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      <nav
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-30',
          'border-t border-stroke bg-surface/95 backdrop-blur',
          'pb-safe-bottom',
        )}
      >
        <ul className="grid grid-cols-3">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <li key={id} className="flex">
                <button
                  type="button"
                  onClick={() => onChange(id)}
                  className={cn(
                    'w-full h-14 flex flex-col items-center justify-center gap-0.5 text-xs transition',
                    isActive ? 'text-brand' : 'text-ink-muted',
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  <span className={cn(isActive && 'font-semibold')}>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
