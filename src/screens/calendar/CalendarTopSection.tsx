import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { PageTopSection } from '../../components/PageTopSection';
const cat = require('../../../assets/cats/hiding-cat.png');
const catSource = Image.resolveAssetSource(cat);

export function CalendarTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection
      icon="calendar"
      title="월간 기록"
      description="하루하루 쌓인 기록을 살펴봐요."
      image={cat}
      imageLabel="달력을 든 고양이"
      imageAspectRatio={catSource.width / catSource.height}
    >
      {children}
    </PageTopSection>
  );
}
