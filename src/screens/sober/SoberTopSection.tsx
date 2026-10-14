import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function SoberTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="거리두기" description="잠시 거리를 두고 싶은 것이 있나요?">
      {children}
    </PageTopSection>
  );
}
