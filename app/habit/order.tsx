import { AppIcon } from '../../src/components/AppIcon';
import { FormSubmitButton } from '../../src/components/FormSubmitButton';
import type { ScrollView } from 'react-native';
import { AlertModal, type AlertContent } from '../../src/components/AlertModal';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { QueryState } from '../../src/components/QueryState';
import { Text } from '../../src/components/Text';
import { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { moveItem } from '../../src/components/sortable/order';
import { sortHabits } from '../../src/db/habit';
import { habitQueries } from '../../src/queries';
import { BottomSheetPage } from '../../src/components/BottomSheetPage';
import { HabitOrderItem } from '../../src/screens/habit/HabitOrderItem';
import { useSettings } from '../../src/settings/SettingsProvider';

export default function HabitOrder() {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const { colors, rem: appRem } = useAppTheme();
  const scrollRef = useAnimatedRef<ScrollView>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const query = useQuery(habitQueries.list(db));
  const [order, setOrder] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resetDefault, setResetDefault] = useState(false);
  const initial = query.data
    ? sortHabits(query.data, { ...settings, habitSort: 'CUSTOM' }).map((habit) => habit.id)
    : [];
  const defaults = query.data
    ? sortHabits(query.data, { ...settings, habitSort: 'DESC', habitPriorityFirst: false }).map(
        (habit) => habit.id,
      )
    : [];
  useEffect(() => {
    if (query.data && order === null)
      setOrder(
        sortHabits(query.data, { ...settings, habitSort: 'CUSTOM' }).map((habit) => habit.id),
      );
  }, [query.data, order, settings]);
  usePreventRemove(saving, () =>
    setAlert({
      title: '잠시만 기다려주세요',
      message: '저장이 진행 중입니다. 완료될 때까지 기다려주세요.',
    }),
  );
  useEffect(() => {
    if (saved && !saving) {
      if (router.canGoBack()) router.back();
      else router.replace('/setting');
    }
  }, [saved, saving, router]);
  const move = useCallback(
    (from: number, to: number) =>
      setOrder((previous) => {
        if (!previous) return previous;
        return moveItem(previous, from, to);
      }),
    [],
  );
  const items = (order ?? [])
    .map((id) => query.data?.find((habit) => habit.id === id))
    .filter((habit) => habit !== undefined);
  const isDefault =
    order !== null &&
    order.length === defaults.length &&
    order.every((id, i) => defaults[i] === id);
  const changes =
    order !== null &&
    !!query.data &&
    (order.length !== initial.length ||
      order.some((id, i) => initial[i] !== id) ||
      (resetDefault && isDefault && settings.habitOrder.length > 0));
  return (
    <>
      <BottomSheetPage
        backRoute="/habit"
        title="습관 순서 설정"
        scrollRef={scrollRef}
        scrollEnabled={!dragging}
        onBeforeClose={() => {
          if (!saving && !dragging) return true;
          if (saving)
            setAlert({
              title: '잠시만 기다려주세요',
              message: '저장이 진행 중입니다. 완료될 때까지 기다려주세요.',
            });
          return false;
        }}
        footer={
          <FormSubmitButton
            disabled={!changes || saving || dragging || query.isPending || query.isError}
            label="순서 저장하기"
            onPress={() => {
              setSaving(true);
              void updateSettings({ habitOrder: isDefault ? [] : (order ?? []) })
                .then(() => setSaved(true))
                .catch((error: Error) =>
                  setAlert({ title: '저장하지 못했어요', message: error.message }),
                )
                .finally(() => setSaving(false));
            }}
          />
        }
      >
        <View>
          <View className="gap-4 mb-4">
            <Text className="text-sm text-center text-theme-text-secondary">
              드래그하거나 방향키로 습관 순서를 변경하세요.
            </Text>

            <QueryState query={query} />
          </View>
          <Sortable.Grid
            data={items}
            keyExtractor={(item) => String(item.id)}
            columns={1}
            customHandle
            sortEnabled={!saving}
            scrollableRef={scrollRef}
            onDragStart={() => setDragging(true)}
            onDragEnd={({ data }) => {
              setOrder(data.map((habit) => habit.id));
              setDragging(false);
            }}
            renderItem={({ item, index }) => (
              <HabitOrderItem
                habit={item}
                index={index}
                count={items.length}
                disabled={saving || dragging}
                onMove={move}
              />
            )}
          />
          <View className="flex-row gap-3 mt-4">
            <Pressable
              accessibilityRole="button"
              disabled={!changes || saving || dragging}
              onPress={() => {
                setOrder(initial);
                setResetDefault(false);
              }}
              className={`flex-1 min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-theme-accent/30 px-2 py-2 active:opacity-65 ${!changes || saving || dragging ? 'opacity-40' : 'opacity-100'}`}
            >
              <AppIcon name="undo" size={appRem * 1.125} color={colors.accentText} />
              <Text className="shrink text-sm text-theme-accent-text">변경사항 취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={
                !order || saving || dragging || (isDefault && settings.habitOrder.length === 0)
              }
              onPress={() => {
                setOrder(defaults);
                setResetDefault(true);
              }}
              className={`flex-1 min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-transparent bg-theme-accent-light px-2 py-2 active:opacity-65 ${!order || saving || dragging || (isDefault && settings.habitOrder.length === 0) ? 'opacity-40' : 'opacity-100'}`}
            >
              <AppIcon name="restart-alt" size={appRem * 1.125} color={colors.accentText} />
              <Text className="shrink text-center text-sm text-theme-accent-text">
                기본 순서로 초기화
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheetPage>
      <AlertModal
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message}
        onConfirm={() => setAlert(null)}
      />
    </>
  );
}
