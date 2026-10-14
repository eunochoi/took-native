import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function HabitTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="습관 관리" hashtags="#실천 #반복 #성장">
      {children}
    </PageTopSection>
  );
}
