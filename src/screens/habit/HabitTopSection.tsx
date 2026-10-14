import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function HabitTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="습관 만들기" description="작은 습관이 큰 변화를 만들어요.">
      {children}
    </PageTopSection>
  );
}
