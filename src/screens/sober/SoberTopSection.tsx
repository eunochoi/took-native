import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { PageTopSection } from '../../components/PageTopSection';
const cat = require('../../../assets/cats/hiding-cat.png');
const catSource = Image.resolveAssetSource(cat);

export function SoberTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection
      icon="sober"
      title="절제 타이머"
      description="더하는 것만큼 절제도 중요해요."
      image={cat}
      imageLabel="노트를 든 고양이"
      imageAspectRatio={catSource.width / catSource.height}
    >
      {children}
    </PageTopSection>
  );
}
