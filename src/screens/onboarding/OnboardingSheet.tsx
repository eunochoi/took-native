import { useI18n } from '../../i18n/react';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AnimatedScrollView } from '../../components/AnimatedScrollView';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import type { CloseBottomSheet } from '../../hooks/useBottomSheetLifecycle';
import { completeOnboarding, hasCompletedOnboarding } from '../../onboarding/storage';
import type { Settings } from '../../settings/model';
import { useSettings } from '../../settings/SettingsProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import tokens from '../../theme/tokens.json';
import { BackupPage } from './BackupPage';
import { CalendarGuidePage } from './CalendarGuidePage';
import { ThemePage } from './ThemePage';
import { UsagePage } from './UsagePage';
import { WelcomePage } from './WelcomePage';
import { WidgetPage } from './WidgetPage';

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
  const { t } = useI18n();
  const titles = [
    t('onboarding.welcomeTitle'),
    t('onboarding.themeTitle'),
    t('onboarding.usageTitle'),
    t('onboarding.calendarTitle'),
    ...(Platform.OS === 'android' ? [t('onboarding.widgetTitle')] : []),
    t('onboarding.backupTitle'),
  ];
  const { settings, updateSettings } = useSettings();
  const { rem, reducedMotion } = useAppTheme();
  const [step, setStep] = useState(0);
  const [width, setWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const allowClose = useRef(!firstRun);
  const carousel = useRef<ScrollView>(null);
  const pageScroll = useAnimatedRef<ScrollView>();
  const swipeStart = useSharedValue({ x: 0, y: 0 });
  const swipeDecided = useSharedValue(false);
  const imageWidth = Math.max(0, Math.min(width - rem * 5, rem * 20));
  useEffect(() => {
    if (width > 0) carousel.current?.scrollTo({ x: step * width, animated: false });
  }, [width]);
  useEffect(() => {
    // Each page starts at the top, matching the sheet's reset scroll position.
    pageScroll.current?.scrollTo({ y: 0, animated: false });
  }, [step, pageScroll]);
  const selectStep = (next: number) => {
    if (saving.current || !width || next < 0 || next >= titles.length) return;
    setStep(next);
    setError('');
    carousel.current?.scrollTo({ x: next * width, animated: !reducedMotion });
  };
  const pageGesture = Gesture.Pan()
    .enabled(!busy && width > 0)
    .manualActivation(true)
    .maxPointers(1)
    .onTouchesDown((event, manager) => {
      swipeDecided.value = false;
      const touch = event.allTouches[0];
      if (!touch || event.numberOfTouches !== 1) {
        swipeDecided.value = true;
        manager.fail();
        return;
      }
      swipeStart.value = { x: touch.absoluteX, y: touch.absoluteY };
    })
    .onTouchesMove((event, manager) => {
      if (swipeDecided.value) return;
      const touch = event.allTouches[0];
      if (!touch || event.numberOfTouches !== 1) {
        swipeDecided.value = true;
        manager.fail();
        return;
      }
      const dx = Math.abs(touch.absoluteX - swipeStart.value.x);
      const dy = Math.abs(touch.absoluteY - swipeStart.value.y);
      if (Math.max(dx, dy) < rem * 0.5) return;
      swipeDecided.value = true;
      // Decide once per touch; a vertical scroll cannot later become a page swipe.
      if (dx > dy * 1.2) manager.activate();
      else manager.fail();
    })
    .onTouchesUp((_event, manager) => {
      if (!swipeDecided.value) manager.fail();
    })
    .onEnd((event, success) => {
      if (success && Math.abs(event.translationX) >= rem * 3) {
        scheduleOnRN(selectStep, step + (event.translationX < 0 ? 1 : -1));
      }
    });
  const change = async (patch: Partial<Settings>) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await updateSettings(patch);
    } catch {
      setError(t('onboarding.saveFailed'));
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
      setError(t('onboarding.completeFailed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const openWeb = () => {
    void Linking.openURL('https://to-ok.me').catch(() => {
      setError(t('onboarding.webFailed'));
    });
  };
  return (
    <BottomSheetModal
      visible
      fixedHeight
      scrollEnabled={!busy}
      scrollRef={pageScroll}
      contentKey={step}
      dismissible={!firstRun}
      onClose={onClose}
      onBeforeClose={() => allowClose.current && !saving.current}
      footer={(close) => (
        <View className="w-full max-w-lg self-center gap-2 px-6 pt-1">
          {!!error && (
            <Text
              accessibilityRole="alert"
              className="text-[14px] leading-[21px] text-theme-danger"
            >
              {error}
            </Text>
          )}
          <View
            accessibilityRole="tablist"
            accessibilityLabel={t('onboarding.steps')}
            className="flex-row items-center justify-center"
          >
            {titles.map((title, index) => (
              <Pressable
                key={index}
                accessibilityRole="tab"
                accessibilityLabel={t('onboarding.stepTitle', { count: index + 1, title })}
                accessibilityState={{ selected: index === step, disabled: busy || !width }}
                disabled={busy || !width}
                onPress={() => selectStep(index)}
                className="h-8 items-center justify-center px-1 active:opacity-65"
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
          <View className="flex-row items-stretch gap-3">
            {step > 0 && (
              <View className="min-w-0 flex-1 basis-0">
                <Button
                  label={t('common.previous')}
                  labelSize="lg"
                  labelClassName="text-[15.75px] leading-[24.5px]"
                  subtle
                  outline
                  disabled={busy || !width}
                  onPress={() => selectStep(step - 1)}
                  className="w-full grow"
                />
              </View>
            )}
            <View className="min-w-0 flex-1 basis-0">
              <Button
                labelSize="lg"
                labelClassName="text-[15.75px] leading-[24.5px]"
                label={
                  busy
                    ? t('common.saving')
                    : step === titles.length - 1
                      ? firstRun
                        ? t('onboarding.start')
                        : t('common.close')
                      : t('common.next')
                }
                disabled={busy || !width}
                onPress={() => (step === titles.length - 1 ? confirm(close) : selectStep(step + 1))}
                className="w-full grow"
              />
            </View>
          </View>
        </View>
      )}
      renderBody={(_close, motion) => (
        <GestureDetector gesture={pageGesture}>
          <ScrollView
            ref={carousel}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            directionalLockEnabled
            accessibilityLabel={t('onboarding.stepStatus', {
              value: titles.length,
              count: step + 1,
            })}
            accessibilityActions={[
              { name: 'increment', label: t('onboarding.nextGuide') },
              { name: 'decrement', label: t('onboarding.previousGuide') },
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
              <WelcomePage
                key="welcome"
                imageWidth={Math.max(0, Math.min(width - rem * 3, rem * 21))}
              />,
              <ThemePage key="theme" settings={settings} busy={busy} onChange={change} />,
              <UsagePage key="usage" imageWidth={imageWidth} />,
              <CalendarGuidePage key="calendar" />,
              ...(Platform.OS === 'android'
                ? [<WidgetPage key="widget" imageWidth={imageWidth} />]
                : []),
              <BackupPage key="backup" onOpenWeb={openWeb} />,
            ].map((content, index) => (
              <View
                key={content.key}
                accessibilityElementsHidden={index !== step}
                importantForAccessibility={index === step ? 'auto' : 'no-hide-descendants'}
                className="h-full"
                style={{ width }}
              >
                <GestureDetector
                  gesture={Gesture.Native().requireExternalGestureToFail(
                    pageGesture,
                    motion.panGesture,
                  )}
                >
                  <AnimatedScrollView
                    ref={index === step ? motion.scrollRef : undefined}
                    onScroll={index === step ? motion.onScroll : undefined}
                    scrollEventThrottle={16}
                    scrollEnabled={!busy}
                    nestedScrollEnabled
                    directionalLockEnabled
                    bounces={false}
                    overScrollMode="never"
                    showsVerticalScrollIndicator={false}
                    className="flex-1 min-h-0 w-full max-w-lg self-center"
                    contentContainerClassName="grow px-6 py-6"
                  >
                    {content}
                  </AnimatedScrollView>
                </GestureDetector>
              </View>
            ))}
          </ScrollView>
        </GestureDetector>
      )}
    />
  );
}
