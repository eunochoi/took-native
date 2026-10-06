import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { PageTopSection } from '../../components/PageTopSection';
const cat = require('../../../assets/cats/hiding-cat-setting.png');
const catSource = Image.resolveAssetSource(cat);

export function SettingsTopSection({ children }: { children?: ReactNode }) {
  return (
    <PageTopSection
      icon="settings"
      title="앱 설정"
      description="나만의 기록 공간을 만들어요."
      image={cat}
      imageLabel="고개를 내민 고양이"
      imageAspectRatio={catSource.width / catSource.height}
    >
      {children}
    </PageTopSection>
  );
}
