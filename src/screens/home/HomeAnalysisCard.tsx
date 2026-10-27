import { useI18n } from '../../i18n/react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function HomeAnalysisCard({ today }: { today: string }) {
  const { t } = useI18n();
  const { rem: appRem } = useAppTheme();
  const { openModal } = useModalNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.analysisLink')}
      onPress={() =>
        openModal({ pathname: '/home/[year]/stats', params: { year: today.slice(0, 4) } })
      }
      className="overflow-hidden rounded-2xl border border-theme-accent-border bg-theme-accent-soft active:opacity-70 ios:curve-continuous"
    >
      <View className="flex-row items-center gap-2 px-4 py-5">
        <AppIcon
          name="statistics"
          size={appRem * 2}
          className="pr-4 mt-1 shrink-0 text-theme-accent"
        />
        <View className="flex-1 min-w-0 gap-1">
          <Text className="text-base leading-6 font-semibold">{t('home.analysisTitle')}</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.5}
            className="text-sm tracking-tighter leading-5 text-theme-text-secondary"
          >
            {t('home.analysisDescription')}
          </Text>
        </View>
        <AppIcon name="chevron-right" size={appRem} className="shrink-0 text-theme-accent-deep" />
      </View>
    </Pressable>
  );
}
