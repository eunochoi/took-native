import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function HabitTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="습관 만들기" hashtags="#실천 #반복 #성장">
      {children}
    </PageTopSection>
  );
}
