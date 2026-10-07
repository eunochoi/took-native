import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { refreshSoberWidgets } from '../../src/widgets/sober';
import {
  chooseBackup,
  discardBackupSelection,
  exportBackup,
  restoreBackup,
} from '../../src/backup';
import { AlertModal, type AlertContent } from '../../src/components/AlertModal';
import { AppIcon } from '../../src/components/AppIcon';
import { ColorView } from '../../src/components/ColorTransition';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { ScrollEdgeFade } from '../../src/components/ScrollEdgeFade';
import { TabBottomSpacer } from '../../src/components/TabBottomSpacer';
import { Text } from '../../src/components/Text';
import { Toolbar } from '../../src/components/Toolbar';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { AppearanceSettingsSection } from '../../src/screens/settings/AppearanceSettingsSection';
import { BackupDestinationPicker } from '../../src/screens/settings/BackupDestinationPicker';
import { BackupSection } from '../../src/screens/settings/BackupSection';
import { EmotionIconStyleSelector } from '../../src/screens/settings/EmotionIconStyleSelector';
import { SettingsTopSection } from '../../src/screens/settings/SettingsTopSection';
import type { Settings } from '../../src/settings/model';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

export default function SettingsScreen() {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const { colors, rem: appRem, iconSizes } = useAppTheme();
  const fade = useScrollFade();
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);
  const db = useSQLiteContext();
  const router = useRouter();
  const client = useQueryClient();
  const { settings, updateSettings, reloadSettings } = useSettings();
  const [activity, setActivity] = useState<'export' | 'restore' | 'settings' | null>(null);
  const active = useRef(false);
  const [backupPicker, setBackupPicker] = useState(false);
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
    if (
      active.current ||
      Object.entries(patch).every(([key, value]) => settings[key as keyof Settings] === value)
    )
      return;
    active.current = true;
    setActivity('settings');
    try {
      await updateSettings(patch);
    } catch (error) {
      setAlert({
        title: '설정을 저장하지 못했어요',
        message: error instanceof Error ? error.message : '다시 시도해주세요.',
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
        setAlert({
          title: '백업 저장 완료',
          message:
            exported > 1
              ? `같은 세트의 백업 파일 ${exported}개를 선택한 폴더에 저장했어요. 복원할 때 모두 함께 선택해주세요.`
              : '선택한 폴더에 백업 파일을 저장했어요.',
        });
    } catch (error) {
      setAlert({
        title: '백업하지 못했어요',
        message: error instanceof Error ? error.message : '다시 시도해주세요.',
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
        setAlert({
          title: '복원하지 못했어요',
          message: error instanceof Error ? error.message : '파일을 확인해주세요.',
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
        setAlert({ title: '복원 완료', message: '백업의 기록과 설정을 불러왔어요.' });
    } catch (error) {
      if (mounted.current)
        setAlert({
          title: restored ? '기록은 복원됐어요' : '복원하지 못했어요',
          message: restored
            ? '화면을 새로 불러오지 못했어요. 앱을 다시 실행해주세요.'
            : error instanceof Error
              ? error.message
              : '파일을 확인해주세요.',
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
        className="flex-1 bg-transparent"
      >
        <SettingsTopSection>
          <Toolbar>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => router.push('/privacy')}
              className={`h-11 shrink-0 flex-row items-center justify-center gap-1.5 px-3.5 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
            >
              <AppIcon name="privacy-tip" size={appRem * 1.2} className="text-theme-accent" />
              <Text className="text-sm leading-snug text-theme-text-secondary">Privacy Policy</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => {
                void Linking.openURL('https://to-ok.me/intro').catch(() =>
                  Alert.alert('앱 소개를 열지 못했어요', '다시 시도해주세요.'),
                );
              }}
              className={`h-11 shrink-0 flex-row items-center justify-center gap-1.5 px-3.5 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
            >
              <AppIcon name="info" size={appRem * 1.2} className="text-theme-accent" />
              <Text className="text-sm leading-snug text-theme-text-secondary">앱 소개</Text>
            </Pressable>
          </Toolbar>
        </SettingsTopSection>
        <View className="pt-6 gap-12" style={{ paddingHorizontal: '5%' }}>
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
              감정 아이콘
            </Text>
            <View className="p-2">
              <EmotionIconStyleSelector
                value={settings.emotionStyle}
                disabled={disabled}
                dimmed={disabled && activity !== 'settings'}
                onChange={(value) => {
                  void change({ emotionStyle: value });
                }}
              />
            </View>
          </View>
          <AppearanceSettingsSection
            settings={settings}
            disabled={disabled}
            onChange={(patch) => {
              void change(patch);
            }}
          />
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
              습관 정렬
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => router.push('/habit/order')}
              className={`p-2 flex-row items-center justify-between gap-2 ${disabled ? 'opacity-40' : 'opacity-100'}`}
            >
              <Text className="text-base text-theme-text-secondary">습관 목록 순서 개인화</Text>
              <AppIcon name="low-priority" size={iconSizes.md} color={colors.accent} />
            </Pressable>
          </View>
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
      <ScrollEdgeFade edge="top" visible={fade.topVisible} />
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />
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
        title="백업으로 복원할까요?"
        message="현재 일기·습관·절제 기록·사진·앱 설정이 백업 내용으로 덮어써져요. 현재 데이터를 유지하려면 복원 전에 먼저 백업해주세요."
        confirmLabel="복원"
        onCancel={cancelRestore}
        onConfirm={() => void restoreSelected()}
      />
      <AlertModal
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message}
        onConfirm={() => setAlert(null)}
      />
    </ColorView>
  );
}
