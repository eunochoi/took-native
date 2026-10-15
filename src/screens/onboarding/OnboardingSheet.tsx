import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Text } from '../../components/Text';
import type { CloseBottomSheet } from '../../hooks/useBottomSheetLifecycle';
import { completeOnboarding, hasCompletedOnboarding } from '../../onboarding/storage';
import type { Settings } from '../../settings/model';
import { useSettings } from '../../settings/SettingsProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import tokens from '../../theme/tokens.json';
import { BackupPage } from './BackupPage';
import { ThemePage } from './ThemePage';
import { UsagePage } from './UsagePage';
import { WelcomePage } from './WelcomePage';
import { WidgetPage } from './WidgetPage';

const titles = [
  '하루를 기록하는 TOOK',
  '나에게 맞게 설정해요',
  '편리하게 사용해요',
  ...(Platform.OS === 'android' ? ['위젯으로 바로 확인해요'] : []),
  '기록을 안전하게 보관해요',
] as const;

export function FirstRunOnboarding({ ready }: { ready: boolean }) {
  const [required, setRequired] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void hasCompletedOnboarding()
      .then((completed) => {
        if (active) setRequired(!completed);
      })
      .catch(() => {
        if (!active) return;
        setRequired(true);
      });
    return () => {
      active = false;
    };
  }, [ready]);
  return required ? <OnboardingSheet firstRun onClose={() => setRequired(false)} /> : null;
}

export function OnboardingSheet({
  firstRun = false,
  onClose,
}: {
  firstRun?: boolean;
  onClose: () => void;
}) {
  const { settings, updateSettings } = useSettings();
  const { rem, reducedMotion } = useAppTheme();
  const { height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [width, setWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const allowClose = useRef(!firstRun);
  const carousel = useRef<ScrollView>(null);
  const imageWidth = Math.max(0, Math.min(width - rem * 5, rem * 20));
  useEffect(() => {
    if (width > 0) carousel.current?.scrollTo({ x: step * width, animated: false });
  }, [width]);
  const selectStep = (next: number) => {
    if (saving.current || !width || next < 0 || next >= titles.length) return;
    setStep(next);
    setError('');
    carousel.current?.scrollTo({ x: next * width, animated: !reducedMotion });
  };
  const change = async (patch: Partial<Settings>) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await updateSettings(patch);
    } catch {
      setError('설정을 저장하지 못했어요. 다시 선택해주세요.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const confirm = async (close: CloseBottomSheet) => {
    if (saving.current || step !== titles.length - 1 || (firstRun && allowClose.current)) return;
    setError('');
    if (!firstRun) {
      close();
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      await completeOnboarding();
      allowClose.current = true;
      saving.current = false;
      close();
    } catch {
      setError('완료 상태를 저장하지 못했어요. 확인 버튼을 다시 눌러주세요.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const openWeb = () => {
    void Linking.openURL('https://to-ok.me').catch(() => {
      setError('TOOK 웹을 열지 못했어요. 다시 시도해주세요.');
    });
  };
  return (
    <BottomSheetModal
      visible
      maxHeight={height * 0.85}
      fixedHeight
      scrollEnabled={!firstRun && !busy}
      dismissible={!firstRun}
      onClose={onClose}
      onBeforeClose={() => allowClose.current && !saving.current}
      footer={
        <View className="items-center gap-2 px-6 py-1">
          {!!error && (
            <Text accessibilityRole="alert" className="text-sm text-theme-danger">
              {error}
            </Text>
          )}
          <View
            accessibilityRole="tablist"
            accessibilityLabel="앱 안내 단계"
            className="flex-row items-center justify-center gap-2"
          >
            {titles.map((title, index) => (
              <Pressable
                key={title}
                accessibilityRole="tab"
                accessibilityLabel={`${index + 1}단계, ${title}`}
                accessibilityState={{ selected: index === step, disabled: busy }}
                disabled={busy}
                onPress={() => selectStep(index)}
                className="items-center justify-center"
              >
                <Animated.View
                  className={`h-2.5 ios:curve-continuous rounded-full ${index === step ? 'bg-theme-accent' : 'bg-theme-text-disabled'}`}
                  style={{
                    width: rem * (index === step ? 1.25 : 0.6),
                    transitionProperty: ['width', 'backgroundColor'],
                    transitionDuration: `${reducedMotion ? 0 : tokens.motion.fade}ms`,
                    transitionTimingFunction: 'ease-in-out',
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      }
      renderBody={(close) => (
        <ScrollView
          ref={carousel}
          horizontal
          pagingEnabled
          scrollEnabled={!busy}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          directionalLockEnabled
          accessibilityLabel={`앱 안내, ${titles.length}단계 중 ${step + 1}단계`}
          accessibilityActions={[
            { name: 'increment', label: '다음 안내' },
            { name: 'decrement', label: '이전 안내' },
          ]}
          onAccessibilityAction={({ nativeEvent }) =>
            selectStep(step + (nativeEvent.actionName === 'increment' ? 1 : -1))
          }
          onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
          onMomentumScrollEnd={({ nativeEvent }) => {
            if (saving.current || !width) return;
            const next = Math.max(
              0,
              Math.min(titles.length - 1, Math.round(nativeEvent.contentOffset.x / width)),
            );
            setStep(next);
            setError('');
          }}
          className="flex-1 min-h-0 w-full"
          contentContainerClassName="h-full flex-row"
        >
          {[
            <WelcomePage key="welcome" onOpenWeb={openWeb} />,
            <ThemePage key="theme" settings={settings} busy={busy} onChange={change} />,
            <UsagePage key="usage" imageWidth={imageWidth} />,
            ...(Platform.OS === 'android'
              ? [<WidgetPage key="widget" imageWidth={imageWidth} />]
              : []),
            <BackupPage key="backup" busy={busy} onConfirm={() => confirm(close)} />,
          ].map((content) => (
            <View key={content.key} className="h-full justify-center py-6" style={{ width }}>
              <View className="w-full max-w-lg self-center px-6">{content}</View>
            </View>
          ))}
        </ScrollView>
      )}
    />
  );
}
