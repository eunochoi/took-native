import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { PageTopSection } from '../../components/PageTopSection';
const cat = require('../../../assets/cats/hiding-cat.png');
const catSource = Image.resolveAssetSource(cat);

export function HabitTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection
      icon="habit"
      title="습관 만들기"
      description="작은 습관이 큰 변화를 만들어요."
      image={cat}
      imageLabel="습관을 체크한 노트를 든 고양이"
      imageAspectRatio={catSource.width / catSource.height}
    >
      {children}
    </PageTopSection>
  );
}
