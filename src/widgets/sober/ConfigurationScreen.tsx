import { useI18n } from '../../i18n/react';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, Text as NativeText, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { WidgetPreview, type WidgetConfigurationScreenProps } from 'react-native-android-widget';
import { SettingsProvider, useSettings } from '../../settings/SettingsProvider';
import { AppThemeProvider } from '../../theme/AppThemeProvider';
import { initializeDatabase } from '../../db/schema';
import { getSoberList, getSoberRestarts } from '../../db/sober';
import { withReadLock } from '../../db';
import type { Sober, SoberRestart } from '../../db/types';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { PickerOption } from '../../components/PickerOption';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { defaultWidgetSettings, type SoberWidgetSettings } from './model';
import { loadWidgetSettings, saveWidgetSettings } from './storage';
import { renderSoberWidget } from './task';
import { SoberWidget } from './SoberWidget';
import { WidgetAppearanceFields } from './WidgetAppearanceFields';

export function SoberWidgetConfiguration(props: WidgetConfigurationScreenProps) {
  const { t } = useI18n();
  const [error, setError] = useState<Error | null>(null);
  const onError = useCallback((value: Error) => setError(value), []);
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        {error ? (
          <SafeAreaView className="flex-1 items-center justify-center p-6">
            <NativeText>{t('widget.settingsFailed')}</NativeText>
          </SafeAreaView>
        ) : (
          <SQLiteProvider databaseName="took.db" onInit={initializeDatabase}>
            <SettingsProvider onError={onError}>
              <AppThemeProvider>
                <ConfigurationContent {...props} />
              </AppThemeProvider>
            </SettingsProvider>
          </SQLiteProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ConfigurationContent({
  widgetInfo,
  renderWidget,
  setResult,
}: WidgetConfigurationScreenProps) {
  const { t, language } = useI18n();
  const db = useSQLiteContext();
  const { settings: appSettings } = useSettings();
  const [records, setRecords] = useState<Sober[]>([]);
  const [restarts, setRestarts] = useState<SoberRestart[]>([]);
  const [settings, setSettings] = useState<SoberWidgetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<'widget.loadFailed' | 'widget.saveFailed' | ''>('');
  const [picker, setPicker] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const [items, history] = await withReadLock(async () =>
        Promise.all([getSoberList(db), getSoberRestarts(db)]),
      );
      const saved = await loadWidgetSettings(widgetInfo.widgetId);
      if (!active) return;
      setRecords(items);
      setRestarts(history);
      const first = items[0];
      setSettings(
        saved && items.some((item) => item.id === saved.soberId)
          ? saved
          : first
            ? { ...(saved ?? defaultWidgetSettings(first.id)), soberId: first.id }
            : saved,
      );
    })()
      .catch(() => {
        if (active) setError('widget.loadFailed');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [db, widgetInfo.widgetId]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving) setResult('cancel');
      return true;
    });
    return () => subscription.remove();
  }, [saving, setResult]);
  const sober = records.find((item) => item.id === settings?.soberId) ?? null;
  const preview = useCallback(
    ({ width, height }: { width: number; height: number }) => (
      <SoberWidget
        settings={settings}
        sober={sober}
        restarts={restarts.filter((item) => item.sober_id === sober?.id)}
        themeAccent={appSettings.themeAccent}
        language={language}
        width={width}
        height={height}
      />
    ),
    [settings, sober, restarts, appSettings.themeAccent, language],
  );
  const change = (patch: Partial<SoberWidgetSettings>) =>
    setSettings((value) => (value ? { ...value, ...patch } : value));
  const save = async () => {
    if (!settings || !sober || saving) return;
    setSaving(true);
    setError('');
    try {
      await saveWidgetSettings(widgetInfo.widgetId, settings);
      renderWidget(await renderSoberWidget(widgetInfo));
      setResult('ok');
    } catch {
      setError('widget.saveFailed');
      setSaving(false);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-theme-background">
      <ScrollView contentContainerClassName="px-[5%] pt-6 pb-8 gap-8">
        <Text className="text-2xl font-bold">{t('widget.configureTitle')}</Text>
        <View
          className={`${MUTED_CARD_BORDER_CLASS_NAME} items-center justify-center ios:curve-continuous rounded-2xl bg-theme-surface-muted p-6`}
        >
          <WidgetPreview width={180} height={180} renderWidget={preview} showBorder={false} />
        </View>
        {loading ? (
          <ActivityIndicator accessibilityLabel={t('common.loading')} />
        ) : (
          <>
            <View className="gap-3">
              <Text className="text-xl font-semibold">{t('widget.chooseRecord')}</Text>
              <Button
                label={sober?.name ?? t('widget.noRecords')}
                subtle
                outline
                disabled={!records.length || saving}
                onPress={() => setPicker(true)}
              />
              {!records.length && (
                <Text className="px-1 text-base text-theme-text-secondary">
                  {t('widget.addFirst')}
                </Text>
              )}
            </View>
            <WidgetAppearanceFields
              settings={settings}
              disabled={!settings || saving}
              onChange={change}
            />
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" className="text-base text-theme-danger">
            {error && t(error)}
          </Text>
        )}
      </ScrollView>
      <View className="flex-row gap-3 px-[5%] pb-8">
        <Button
          className="flex-1"
          label={t('common.cancel')}
          subtle
          disabled={saving}
          onPress={() => setResult('cancel')}
        />
        <Button
          className="flex-1"
          label={saving ? t('widget.saving') : t('widget.apply')}
          disabled={loading || saving || !sober}
          onPress={() => void save()}
        />
      </View>
      <BottomSheetModal
        visible={picker}
        title={t('widget.chooseRecord')}
        onClose={() => setPicker(false)}
      >
        {(close) => (
          <View className="gap-3">
            {records.map((item) => (
              <PickerOption
                key={item.id}
                selected={settings?.soberId === item.id}
                accessibilityLabel={item.name}
                onPress={() => {
                  change({ soberId: item.id });
                  close();
                }}
              >
                <Text
                  className={`text-base ${settings?.soberId === item.id ? 'text-theme-accent-deep' : ''}`}
                >
                  {item.name}
                </Text>
              </PickerOption>
            ))}
          </View>
        )}
      </BottomSheetModal>
    </SafeAreaView>
  );
}
