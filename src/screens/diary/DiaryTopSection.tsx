import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function DiaryTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="일기 목록" description="지나온 하루를 천천히 내려봐요.">
      {children}
    </PageTopSection>
  );
}
