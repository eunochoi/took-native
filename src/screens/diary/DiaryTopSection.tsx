import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { PageTopSection } from '../../components/PageTopSection';
const cat = require('../../../assets/cats/hiding-cat.png');
const catSource = Image.resolveAssetSource(cat);

export function DiaryTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection
      icon="diary"
      title="일기 목록"
      description="지나온 하루를 천천히 내려봐요."
      image={cat}
      imageLabel="일기장을 든 고양이"
      imageAspectRatio={catSource.width / catSource.height}
    >
      {children}
    </PageTopSection>
  );
}
