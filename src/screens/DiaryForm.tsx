import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
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
      if (date === null || !isDate(date) || date > today)
        throw new Error('일기 날짜를 선택해주세요.');
      if (emotion === null) throw new Error('오늘의 감정을 선택해주세요.');
      return saveDiaryImages(db, { id, date, emotion, text }, images);
    },
    'diary',
    () => setSaved(true),
    (error) => showNotice({ tone: 'error', title: '처리하지 못했어요', message: error.message }),
  );
  const busy = mutation.isPending || picking;
  usePreventRemove(busy, () =>
    showNotice({
      tone: 'info',
      title: '잠시만 기다려주세요',
      message: mutation.isPending
        ? '저장이 진행 중입니다. 완료될 때까지 기다려주세요.'
        : '사진을 준비하고 있습니다.',
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
  const title = date
    ? format(parseISO(date), 'yyyy. M. d. EEEE', { locale: ko })
    : '날짜를 선택해주세요';
  const onClosed = saved
    ? () =>
        showNotice({
          tone: 'success',
          title: id ? '일기를 수정했어요' : '일기를 저장했어요',
        })
    : undefined;
  if (id !== undefined && (query.isPending || query.error || !query.data))
    return (
      <BottomSheetPage
        title="일기 수정"
        backRoute="/diary"
        closeRequested={saved && !mutation.isPending}
        onClosed={onClosed}
      >
        <View className="items-center justify-center">
          <QueryState query={query} />
          {!query.isPending && !query.error && <Text>일기를 찾을 수 없습니다.</Text>}
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
              accessibilityLabel: `${title}, 일기 날짜 선택`,
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
          title: '잠시만 기다려주세요',
          message: mutation.isPending
            ? '저장이 진행 중입니다. 완료될 때까지 기다려주세요.'
            : '사진을 준비하고 있습니다.',
        });
        return false;
      }}
      footer={
        <FormSubmitButton
          loading={mutation.isPending}
          disabled={busy || dragging || date === null || emotion === null || !text.trim()}
          onPress={() => mutation.mutate(undefined)}
          label={mutation.isPending ? '저장 중...' : id ? '수정한 기록 저장하기' : '기록 저장하기'}
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
                        title: '사진을 추가하지 못했어요',
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
            accessibilityLabel="오늘의 감정 선택"
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
              <Text className={SECTION_TITLE_CLASS_NAME}>오늘의 감정</Text>
              <Text className="text-sm text-theme-text-secondary">
                {emotion !== null ? EMOTIONS[emotion].name : '감정을 골라주세요'}
              </Text>
            </View>
            <View className="flex-row items-center gap-0.5">
              <Text className="text-base text-theme-text-secondary">
                {emotion !== null ? '변경' : '선택'}
              </Text>
              <AppIcon name="chevron-right" size={iconSizes.md} color={colors.secondary} />
            </View>
          </Pressable>
        </View>
      )}
      <View className="shrink min-h-0 gap-3 pt-2">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          오늘의 이야기
        </Text>
        <View className="shrink min-h-0 gap-3 p-2">
          <TextInput
            accessibilityLabel="일기 내용"
            multiline
            scrollEnabled
            value={text}
            onChangeText={setText}
            onContentSizeChange={({ nativeEvent }) =>
              setTextHeight(Math.ceil(nativeEvent.contentSize.height))
            }
            editable={!busy && picker === null}
            maxLength={DIARY_TEXT_MAX_LENGTH}
            placeholder="기억하고 싶은 순간을 남겨보세요."
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
          accessibilityLabel={`사진 관리, ${images.length}장`}
          accessibilityState={{ expanded: picker === 'images', disabled: busy }}
          disabled={busy}
          onPress={() => {
            Keyboard.dismiss();
            setPicker('images');
          }}
          className="shrink-0 min-h-12 flex-row items-center gap-2 ios:curve-continuous rounded-2xl px-2 active:opacity-70"
        >
          <AppIcon name="image" size={iconSizes.md} className="text-theme-accent" />
          <Text className="flex-1 text-base text-theme-text-secondary">사진 {images.length}장</Text>
          <AppIcon name="chevron-right" size={iconSizes.md} className="text-theme-text-secondary" />
        </Pressable>
      )}
    </RecordFormLayout>
  );
}
