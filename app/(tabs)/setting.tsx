import { useQueryClient } from '@tanstack/react-query';
import { useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import {
  chooseBackup,
  discardBackupSelection,
  exportBackup,
  restoreBackup,
} from '../../src/backup';
import { AppIcon } from '../../src/components/AppIcon';
import { ColorView } from '../../src/components/ColorTransition';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { useNotice } from '../../src/components/NoticeProvider';
import { PageTopSection } from '../../src/components/PageTopSection';
import { ScrollEdgeFade } from '../../src/components/ScrollEdgeFade';
import { TabBottomSpacer } from '../../src/components/TabBottomSpacer';
import { Text } from '../../src/components/Text';
import { Toolbar } from '../../src/components/Toolbar';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { useI18n } from '../../src/i18n/react';
import { useModalNavigation } from '../../src/navigation/ModalNavigationProvider';
import { OnboardingSheet } from '../../src/screens/onboarding/OnboardingSheet';
import { AppearanceSettingsSection } from '../../src/screens/settings/AppearanceSettingsSection';
import { BackupDestinationPicker } from '../../src/screens/settings/BackupDestinationPicker';
import { BackupSection } from '../../src/screens/settings/BackupSection';
import { LanguageSettingsSection } from '../../src/screens/settings/LanguageSettingsSection';
import { NotificationSettingsSection } from '../../src/screens/settings/NotificationSettingsSection';
import type { Settings } from '../../src/settings/model';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';
import { refreshSoberWidgets } from '../../src/widgets/sober';

export default function SettingsScreen() {
  const { t } = useI18n();
  const { showNotice } = useNotice();
  const { colors, rem: appRem, iconSizes } = useAppTheme();
  const fade = useScrollFade();
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);
  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const client = useQueryClient();
  const { settings, updateSettings, reloadSettings } = useSettings();
  const [activity, setActivity] = useState<'export' | 'restore' | 'settings' | null>(null);
  const active = useRef(false);
  const [backupPicker, setBackupPicker] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<string[] | null>(null);
  // Own selected cache files until cancel/confirm; consume once even before React re-renders.
  const restoreSelection = useRef<string[] | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (restoreSelection.current) discardBackupSelection(restoreSelection.current);
      restoreSelection.current = null;
    };
  }, []);
  const cancelRestore = () => {
    const uris = restoreSelection.current;
    if (!uris) return;
    restoreSelection.current = null;
    discardBackupSelection(uris);
    setPendingRestore(null);
    active.current = false;
    setActivity(null);
  };
  const change = async (patch: Partial<Settings>) => {
    if (active.current) return;
    if (Object.entries(patch).every(([key, value]) => settings[key as keyof Settings] === value))
      return;
    active.current = true;
    setActivity('settings');
    try {
      await updateSettings(patch);
    } catch (error) {
      showNotice({
        tone: 'error',
        title: t('settings.saveFailed'),
        message: error instanceof Error ? error.message : t('common.retryMessage'),
      });
    } finally {
      active.current = false;
      setActivity(null);
    }
  };
  const exportRecords = async (destination: 'device' | 'share') => {
    if (active.current) return;
    active.current = true;
    setActivity('export');
    try {
      const exported = await exportBackup(db, destination);
      if (exported && destination === 'device')
        showNotice({
          tone: 'success',
          title: t('settings.backupSaved'),
          message:
            exported > 1
              ? t('settings.backupPartsSaved', { count: exported })
              : t('settings.backupSingleSaved'),
        });
    } catch (error) {
      showNotice({
        tone: 'error',
        title: t('settings.backupFailed'),
        message: error instanceof Error ? error.message : t('common.retryMessage'),
      });
    } finally {
      active.current = false;
      setActivity(null);
    }
  };
  const restore = async () => {
    if (active.current) return;
    active.current = true;
    setActivity('restore');
    try {
      const uris = await chooseBackup();
      if (!uris) return;
      if (!mounted.current) {
        discardBackupSelection(uris);
        return;
      }
      restoreSelection.current = uris;
      setPendingRestore(uris);
    } catch (error) {
      if (mounted.current)
        showNotice({
          tone: 'error',
          title: t('settings.restoreFailed'),
          message: error instanceof Error ? error.message : t('settings.checkFile'),
        });
    } finally {
      if (!restoreSelection.current) {
        active.current = false;
        if (mounted.current) setActivity(null);
      }
    }
  };
  const restoreSelected = async () => {
    const uris = restoreSelection.current;
    if (!uris || !mounted.current) return;
    restoreSelection.current = null;
    setPendingRestore(null);
    let restored = false;
    try {
      await client.cancelQueries();
      if (!mounted.current) return;
      await restoreBackup(db, uris);
      restored = true;
      refreshSoberWidgets();
      await Promise.all([reloadSettings(), client.resetQueries()]);
      if (mounted.current)
        showNotice({
          tone: 'success',
          title: t('settings.restored'),
          message: t('settings.restoredMessage'),
        });
    } catch (error) {
      if (mounted.current)
        showNotice({
          tone: 'error',
          title: restored ? t('settings.restoredButReloadFailed') : t('settings.restoreFailed'),
          message: restored
            ? t('settings.restartAfterRestore')
            : error instanceof Error
              ? error.message
              : t('settings.checkFile'),
        });
    } finally {
      discardBackupSelection(uris);
      active.current = false;
      if (mounted.current) setActivity(null);
    }
  };
  const disabled = activity !== null;
  return (
    <ColorView className={PAGE_CLASS_NAME}>
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onScroll={fade.onScroll}
        onLayout={fade.onLayout}
        onContentSizeChange={fade.onContentSizeChange}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0, 2]}
        className="flex-1 bg-transparent"
      >
        <View collapsable={false} pointerEvents="none" className="h-0 overflow-visible">
          <ScrollEdgeFade edge="top" visible={fade.topVisible} />
        </View>
        <PageTopSection title={t('settings.title')} hashtags={t('settings.hashtags')} />
        <Toolbar>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setOnboardingOpen(true)}
            className={`shrink-0 flex-row items-center justify-center gap-1.5 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
          >
            <AppIcon name="info" size={appRem * 1.2} className="text-theme-accent" />
            <Text className="text-sm leading-snug text-theme-text-secondary">
              {t('settings.about')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            accessibilityLabel={t('settings.privacy')}
            onPress={() => openModal('/privacy')}
            className={`shrink-0 flex-row items-center justify-center gap-1.5 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
          >
            <AppIcon name="privacy-tip" size={appRem * 1.2} className="text-theme-accent" />
            <Text className="text-sm leading-snug text-theme-text-secondary">
              {t('settings.privacy')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('settings.webOpen')}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => {
              void Linking.openURL('https://to-ok.me').catch(() =>
                showNotice({
                  tone: 'error',
                  title: t('settings.webFailed'),
                  message: t('settings.checkConnection'),
                }),
              );
            }}
            className={`ml-auto shrink-0 flex-row items-center justify-center gap-1.5 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
          >
            <AppIcon name="open-in-new" size={appRem * 1.2} className="text-theme-accent" />
          </Pressable>
        </Toolbar>
        <View className="gap-12" style={{ paddingHorizontal: '5%' }}>
          <NotificationSettingsSection disabled={disabled} />
          <AppearanceSettingsSection
            settings={settings}
            disabled={disabled}
            dimmed={disabled && activity !== 'settings'}
            onChange={change}
          />
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
              {t('settings.habitOrder')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => openModal('/habit/order')}
              className={`py-2 px-1 flex-row items-center justify-between gap-2 ${disabled ? 'opacity-40' : 'opacity-100'}`}
            >
              <Text className="text-base text-theme-text-secondary">
                {t('settings.customHabitOrder')}
              </Text>
              <AppIcon name="low-priority" size={iconSizes.md} color={colors.accent} />
            </Pressable>
          </View>
          <LanguageSettingsSection
            value={settings.language}
            disabled={disabled}
            onChange={(language) => change({ language })}
          />
          <BackupSection
            activity={activity}
            onExport={() => setBackupPicker(true)}
            onRestore={() => {
              void restore();
            }}
          />
        </View>
        <TabBottomSpacer />
      </ScrollView>
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />

      {onboardingOpen && <OnboardingSheet onClose={() => setOnboardingOpen(false)} />}
      {backupPicker && (
        <BackupDestinationPicker
          onClose={() => setBackupPicker(false)}
          onSelect={(destination) => {
            void exportRecords(destination);
          }}
        />
      )}
      <ConfirmModal
        danger
        visible={pendingRestore !== null}
        title={t('settings.restoreConfirm')}
        message={t('settings.restoreWarning')}
        confirmLabel={t('settings.restore')}
        cancelLabel={t('common.cancel')}
        onCancel={cancelRestore}
        onConfirm={() => void restoreSelected()}
      />
    </ColorView>
  );
}
