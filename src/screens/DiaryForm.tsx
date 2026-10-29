import { formatDisplayDate } from '../i18n/format';
import { useI18n } from '../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { BottomSheetPage } from '../components/BottomSheetPage';
import { CharacterCount } from '../components/CharacterCount';
import { EmotionImage } from '../components/EmotionImage';
import { FormSubmitButton } from '../components/FormSubmitButton';
import { useNotice } from '../components/NoticeProvider';
import { QueryState } from '../components/QueryState';
import { RecordFormLayout } from '../components/RecordFormLayout';
import { Text } from '../components/Text';
import { EMOTIONS } from '../domain/constants';
import { isDate } from '../domain/date';
import { DIARY_IMAGE_MAX_COUNT, DIARY_TEXT_MAX_LENGTH } from '../domain/limits';
import {
  discardDraftImages,
  mediaUri,
  pickImages,
  saveDiaryImages,
  type DraftImage,
} from '../media';
import { diaryQueries, useRecordMutation, useToday } from '../queries';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FORM_TEXT_INPUT_CLASS_NAME, SECTION_TITLE_CLASS_NAME } from '../theme/classes';
import { DiaryDatePicker } from './diary/DiaryDatePicker';
import { DiaryEmotionPicker } from './diary/DiaryEmotionPicker';
import { DiaryImagesPicker } from './diary/DiaryImagesPicker';

export function DiaryForm({
  id,
  initialDate,
  allowDateChange = false,
}: {
  id?: number;
  initialDate?: string;
  allowDateChange?: boolean;
}) {
  const { t, formatLocale } = useI18n();

  const { showNotice } = useNotice();
  const { colors, rem: appRem, iconSizes } = useAppTheme();
  const db = useSQLiteContext();
  const today = useToday();
  const query = useQuery({ ...diaryQueries.byId(db, id ?? 0), enabled: id !== undefined });
  const [date, setDate] = useState<string | null>(
    isDate(initialDate) && initialDate <= today ? initialDate : allowDateChange ? null : today,
  );
  const [text, setText] = useState('');
  const [textHeight, setTextHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const [emotion, setEmotion] = useState<number | null>(null);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [picker, setPicker] = useState<'emotion' | 'images' | 'date' | null>(null);
  const [picking, setPicking] = useState(false);
  const [saved, setSaved] = useState(false);
  const drafts = useRef<DraftImage[]>([]);
  const mounted = useRef(true);
  const [draftEmotion, setDraftEmotion] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  useEffect(() => {
    if (query.data && !loaded.current) {
      loaded.current = true;
      setDate(query.data.date);
      setText(query.data.text);
      setEmotion(query.data.emotion);
      setImages(
        query.data.images.map((image) => ({
          file: image.file_name,
          uri: mediaUri(image.file_name),
        })),
      );
    }
  }, [query.data]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discardDraftImages(drafts.current);
    };
  }, []);
  const mutation = useRecordMutation(
    async () => {
      if (date === null || !isDate(date) || date > today) throw new Error(t('diary.dateRequired'));
      if (emotion === null) throw new Error(t('diary.emotionRequired'));
      return saveDiaryImages(db, { id, date, emotion, text }, images);
    },
    'diary',
    () => setSaved(true),
    (error) =>
      showNotice({ tone: 'error', title: t('diary.processFailed'), message: error.message }),
  );
  const busy = mutation.isPending || picking;
  usePreventRemove(busy, () =>
    showNotice({
      tone: 'info',
      title: t('diary.wait'),
      message: mutation.isPending ? t('diary.savingHint') : t('diary.preparingPhotos'),
    }),
  );
  const onReorder = useCallback((from: number, to: number) => {
    setImages((previous) => {
      const next = [...previous];
      const [image] = next.splice(from, 1);
      next.splice(to, 0, image);
      return next;
    });
  }, []);
  const title = date ? formatDisplayDate(date, formatLocale, 'form') : t('diary.datePrompt');
  const onClosed = saved
    ? () =>
        showNotice({
          tone: 'success',
          title: id ? t('diary.edited') : t('diary.saved'),
        })
    : undefined;
  if (id !== undefined && (query.isPending || query.error || !query.data))
    return (
      <BottomSheetPage
        title={t('diary.editTitle')}
        backRoute="/diary"
        closeRequested={saved && !mutation.isPending}
        onClosed={onClosed}
      >
        <View className="items-center justify-center">
          <QueryState query={query} />
          {!query.isPending && !query.error && <Text>{t('diary.notFound')}</Text>}
        </View>
      </BottomSheetPage>
    );
  return (
    <RecordFormLayout
      backRoute="/diary"
      fillContent
      closeRequested={saved && !mutation.isPending}
      onClosed={onClosed}
      title={title}
      titleAction={
        id !== undefined || allowDateChange
          ? {
              accessibilityLabel: date
                ? t('diary.dateChoice', { title })
                : t('diary.chooseDate'),
              disabled: busy || dragging || picker !== null,
              onPress: () => {
                Keyboard.dismiss();
                setPicker('date');
              },
            }
          : undefined
      }
      onBeforeClose={() => {
        if (!busy) return true;
        showNotice({
          tone: 'info',
          title: t('diary.wait'),
          message: mutation.isPending ? t('diary.savingHint') : t('diary.preparingPhotos'),
        });
        return false;
      }}
      footer={
        <FormSubmitButton
          loading={mutation.isPending}
          disabled={busy || dragging || date === null || emotion === null || !text.trim()}
          onPress={() => mutation.mutate(undefined)}
          label={
            mutation.isPending ? t('diary.saving') : id ? t('diary.saveEdited') : t('diary.save')
          }
        />
      }
      overlays={
        <>
          {(id !== undefined || allowDateChange) && picker === 'date' && (
            <DiaryDatePicker
              value={date}
              diaryId={id}
              onClose={() => setPicker(null)}
              onApply={(next) => {
                setDate(next);
                setPicker(null);
              }}
            />
          )}
          {picker === 'emotion' && (
            <DiaryEmotionPicker
              value={draftEmotion}
              onClose={() => setPicker(null)}
              onApply={(value) => {
                setEmotion(value);
                setPicker(null);
              }}
            />
          )}
          {picker === 'images' && (
            <DiaryImagesPicker
              onClose={() => setPicker(null)}
              images={images}
              busy={busy}
              picking={picking}
              dragging={dragging}
              onDragging={setDragging}
              onReorder={onReorder}
              onRemove={(file) =>
                setImages((previous) => previous.filter((image) => image.file !== file))
              }
              onPick={() => {
                setPicking(true);
                void pickImages(DIARY_IMAGE_MAX_COUNT - images.length)
                  .then((added) => {
                    if (!mounted.current) {
                      discardDraftImages(added);
                      return;
                    }
                    drafts.current.push(...added);
                    setImages((previous) => [...previous, ...added]);
                  })
                  .catch((error: Error) => {
                    if (mounted.current)
                      showNotice({
                        tone: 'error',
                        title: t('diary.photoFailed'),
                        message: error.message,
                      });
                  })
                  .finally(() => {
                    if (mounted.current) setPicking(false);
                  });
              }}
            />
          )}
        </>
      }
    >
      {!keyboardVisible && (
        <View className="shrink-0 pb-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('diary.chooseTodayEmotion')}
            accessibilityState={{ expanded: picker === 'emotion', disabled: busy }}
            disabled={busy}
            onPress={() => {
              Keyboard.dismiss();
              setDraftEmotion(emotion);
              setPicker('emotion');
            }}
            className="min-h-12 flex-row items-center gap-3 bg-transparent p-1 active:opacity-70"
          >
            <View className="h-14 w-14 items-start justify-center">
              {emotion !== null ? (
                <EmotionImage emotion={emotion} size={appRem * 3.5} />
              ) : (
                <AppIcon name="emoji-emotions" size={appRem * 3.5} color={colors.tertiary} />
              )}
            </View>
            <View className="flex-1 min-w-0 gap-1">
              <Text className={SECTION_TITLE_CLASS_NAME}>{t('diary.todayEmotion')}</Text>
              <Text className="text-sm text-theme-text-secondary">
                {emotion !== null
                  ? t(`emotions.${EMOTIONS[emotion].key}`)
                  : t('diary.emotionPrompt')}
              </Text>
            </View>
            <View className="flex-row items-center gap-0.5">
              <Text className="text-base text-theme-text-secondary">
                {emotion !== null ? t('diary.change') : t('diary.choose')}
              </Text>
              <AppIcon name="chevron-right" size={iconSizes.md} color={colors.secondary} />
            </View>
          </Pressable>
        </View>
      )}
      <View className="shrink min-h-0 gap-3 pt-2">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('diary.storyTitle')}
        </Text>
        <View className="shrink min-h-0 gap-3 p-1">
          <TextInput
            accessibilityLabel={t('diary.content')}
            multiline
            scrollEnabled
            value={text}
            onChangeText={setText}
            onContentSizeChange={({ nativeEvent }) =>
              setTextHeight(Math.ceil(nativeEvent.contentSize.height))
            }
            editable={!busy && picker === null}
            maxLength={DIARY_TEXT_MAX_LENGTH}
            placeholder={t('diary.placeholder')}
            placeholderTextColor={colors.tertiary}
            textAlignVertical="top"
            className={`shrink min-h-0 pb-6 ${FORM_TEXT_INPUT_CLASS_NAME}`}
            style={{ height: Math.max(appRem * 12, textHeight) }}
          />
          <CharacterCount length={text.length} maxLength={DIARY_TEXT_MAX_LENGTH} />
        </View>
      </View>
      {!keyboardVisible && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('diary.photoManage', { count: images.length })}
          accessibilityState={{ expanded: picker === 'images', disabled: busy }}
          disabled={busy}
          onPress={() => {
            Keyboard.dismiss();
            setPicker('images');
          }}
          className="shrink-0 min-h-12 flex-row items-center gap-2 ios:curve-continuous rounded-2xl px-2 active:opacity-70"
        >
          <AppIcon name="image" size={iconSizes.md} className="text-theme-accent" />
          <Text className="flex-1 text-base text-theme-text-secondary">
            {t('diary.photos', { count: images.length })}
          </Text>
          <AppIcon name="chevron-right" size={iconSizes.md} className="text-theme-text-secondary" />
        </Pressable>
      )}
    </RecordFormLayout>
  );
}
