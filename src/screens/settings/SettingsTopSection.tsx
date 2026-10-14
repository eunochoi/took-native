import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function SettingsTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="앱 설정" description="#맞춤 #기록 공간">
      {children}
    </PageTopSection>
  );
}
