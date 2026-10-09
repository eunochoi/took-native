import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/AppThemeProvider';
import { Text } from './Text';

export interface NoticeContent {
  title: string;
  message?: string;
  tone?: 'info' | 'success' | 'error';
}
type Notice = NoticeContent & { id: number };
interface NoticeContextValue {
  notice: Notice | null;
  hosts: string[];
  showNotice: (content: NoticeContent) => void;
  registerHost: (id: string) => () => void;
}
const NoticeContext = createContext<NoticeContextValue | null>(null);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [hosts, setHosts] = useState<string[]>([]);
  const sequence = useRef(0);
  const showNotice = useCallback((content: NoticeContent) => {
    setNotice({ ...content, id: ++sequence.current });
  }, []);
  const registerHost = useCallback((id: string) => {
    setHosts((current) => [...current.filter((host) => host !== id), id]);
    return () => setHosts((current) => current.filter((host) => host !== id));
  }, []);
  useEffect(() => {
    if (!notice) return;
    AccessibilityInfo.announceForAccessibility(
      [notice.title, notice.message].filter(Boolean).join('. '),
    );
    const timeout = setTimeout(
      () => {
        setNotice((current) => (current?.id === notice.id ? null : current));
      },
      notice.tone === 'error' ? 4000 : 2000,
    );
    return () => clearTimeout(timeout);
  }, [notice]);
  return (
    <NoticeContext.Provider value={{ notice, hosts, showNotice, registerHost }}>
      <View className="flex-1">
        {children}
        <NoticeHost />
      </View>
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) throw new Error('NoticeProvider가 필요합니다.');
  return { showNotice: context.showNotice };
}

// Native Modal windows need their own host. The standalone widget configuration has no notices.
export function NoticeHost({
  modal = false,
  active = true,
}: {
  modal?: boolean;
  active?: boolean;
}) {
  const context = useContext(NoticeContext);
  return context ? <NoticeSurface context={context} modal={modal} active={active} /> : null;
}

function NoticeSurface({
  context: { notice, hosts, registerHost },
  modal,
  active,
}: {
  context: NoticeContextValue;
  modal: boolean;
  active: boolean;
}) {
  const id = useId();
  const insets = useSafeAreaInsets();
  const { rem } = useAppTheme();
  useLayoutEffect(() => {
    if (modal && active) return registerHost(id);
  }, [modal, active, id, registerHost]);
  const topHost = hosts.at(-1);
  if (!active || !notice || (modal ? topHost !== id : topHost !== undefined)) return null;
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 z-50 items-center"
      style={{
        top: insets.top + rem,
        paddingLeft: insets.left + rem,
        paddingRight: insets.right + rem,
      }}
    >
      <View
        className={`max-w-full rounded-2xl border bg-theme-surface px-5 py-3 shadow-lg ${notice.tone === 'error' ? 'border-theme-danger' : 'border-theme-border-muted'}`}
      >
        <Text
          className={`text-center text-base font-medium ${notice.tone === 'error' ? 'text-theme-danger' : 'text-theme-text-primary'}`}
        >
          {notice.title}
        </Text>
        {!!notice.message && (
          <Text className="mt-1 text-center text-sm text-theme-text-secondary">
            {notice.message}
          </Text>
        )}
      </View>
    </View>
  );
}
