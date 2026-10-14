import type { ReactNode } from 'react';
import { PageTopSection } from '../../components/PageTopSection';

export function SoberTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection title="거리두기" description="#잠시멈춤 #회복 #변화">
      {children}
    </PageTopSection>
  );
}
