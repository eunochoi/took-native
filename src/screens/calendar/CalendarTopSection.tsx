import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function CalendarTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="월간 기록" hashtags="#기록 #감정 #발자국">
      {children}
    </PageTopSection>
  );
}
