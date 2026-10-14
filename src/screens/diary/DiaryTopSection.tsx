import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function DiaryTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="일기 목록" hashtags="#감정 #끄적끄적">
      {children}
    </PageTopSection>
  );
}
