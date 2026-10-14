import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function SettingsTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="앱 설정" description="나만의 기록 공간을 만들어요.">
      {children}
    </PageTopSection>
  );
}
