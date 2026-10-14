import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function DiaryTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="일기 목록" description="#감정 #습관 #끄적끄적">
      {children}
    </PageTopSection>
  );
}
