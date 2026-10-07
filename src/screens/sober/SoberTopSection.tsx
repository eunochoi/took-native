import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { PageTopSection } from '../../components/PageTopSection';
const cat = require('../../../assets/cats/hiding-cat.png');
const catSource = Image.resolveAssetSource(cat);

export function SoberTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection
      icon="sober"
      title="거리두기"
      description="잠시 거리를 두고 싶은 것이 있나요?"
      image={cat}
      imageLabel="노트를 든 고양이"
      imageAspectRatio={catSource.width / catSource.height}
    >
      {children}
    </PageTopSection>
  );
}
