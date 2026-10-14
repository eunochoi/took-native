import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function CalendarTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="월간 기록" description="하루하루 쌓인 기록을 살펴봐요.">
      {children}
    </PageTopSection>
  );
}
