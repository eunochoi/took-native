import {
  SECTION_TITLE_CLASS_NAME,
  BODY_DESCRIPTION_CLASS_NAME,
  FORM_TEXT_INPUT_CLASS_NAME,
} from '../theme/classes';
import { FormSubmitButton } from '../components/FormSubmitButton';
import { CharacterCount } from '../components/CharacterCount';
import { RecordFormLayout } from '../components/RecordFormLayout';
import { AlertModal, type AlertContent } from '../components/AlertModal';
import { DIARY_TEXT_MAX_LENGTH, DIARY_IMAGE_MAX_COUNT } from '../domain/limits';
import { useAppTheme } from '../theme/AppThemeProvider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useQuery } from '@tanstack/react-query';
import { diaryQueries, useRecordMutation, useToday } from '../queries';
import {
  discardDraftImages,
  mediaUri,
  pickImages,
  saveDiaryImages,
  type DraftImage,
} from '../media';
import { usePreventRemove } from 'expo-router/react-navigation';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { AppIcon } from '../components/AppIcon';
import { BottomSheetPage } from '../components/BottomSheetPage';
import { DiaryEmotionPicker } from './diary/DiaryEmotionPicker';
import { DiaryFormImages } from './diary/DiaryFormImages';
import { Text } from '../components/Text';
import { EmotionImage } from '../components/EmotionImage';
import { QueryState } from '../components/QueryState';
import { EMOTIONS } from '../domain/constants';
import { isDate } from '../domain/date';

export function DiaryForm({ id, initialDate }: { id?: number; initialDate?: string }) {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const { colors, rem: appRem, iconSizes } = useAppTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const today = useToday();
  const query = useQuery({ ...diaryQueries.byId(db, id ?? 0), enabled: id !== undefined });
  const [date, setDate] = useState(
    isDate(initialDate) && initialDate <= today ? initialDate : today,
  );
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<number | null>(null);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [picker, setPicker] = useState<'emotion' | null>(null);
  const [picking, setPicking] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const drafts = useRef<DraftImage[]>([]);
  const mounted = useRef(true);
  const [draftEmotion, setDraftEmotion] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const loaded = useRef(false);
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
      if (emotion === null) throw new Error('오늘의 감정을 선택해주세요.');
      return saveDiaryImages(db, { id, date, emotion, text }, images);
    },
    'diary',
    (diaryId) => setSavedId(diaryId),
    (error) => setAlert({ title: '처리하지 못했어요', message: error.message }),
  );
  const busy = mutation.isPending || picking;
  usePreventRemove(busy, () =>
    setAlert({
      title: '잠시만 기다려주세요',
      message: mutation.isPending
        ? '저장이 진행 중입니다. 완료될 때까지 기다려주세요.'
        : '사진을 준비하고 있습니다.',
    }),
  );
  useEffect(() => {
    // Navigate after the mutation releases the save/back guard.
    if (savedId !== null && !mutation.isPending) router.replace(`/diary/${savedId}`);
  }, [savedId, mutation.isPending, router]);
  const onReorder = useCallback((from: number, to: number) => {
    setImages((previous) => {
      const next = [...previous];
      const [image] = next.splice(from, 1);
      next.splice(to, 0, image);
      return next;
    });
  }, []);
  const title = format(parseISO(date), 'yyyy. M. d. EEEE', { locale: ko });
  if (id !== undefined && (query.isPending || query.error || !query.data))
    return (
      <BottomSheetPage backRoute="/diary" title="일기 수정">
        <QueryState query={query} />
        {!query.isPending && !query.error && <Text className="p-6">일기를 찾을 수 없습니다.</Text>}
      </BottomSheetPage>
    );
  return (
    <RecordFormLayout
      scrollEnabled={!dragging}
      title={title}
      backRoute="/diary"
      onBeforeClose={() => {
        if (!busy) return true;
        setAlert({
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
          disabled={busy || dragging || emotion === null || !text.trim()}
          onPress={() => mutation.mutate(undefined)}
          label={mutation.isPending ? '저장 중...' : id ? '수정한 기록 저장하기' : '기록 저장하기'}
        />
      }
      overlays={
        <>
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
          <AlertModal
            visible={alert !== null}
            title={alert?.title ?? ''}
            message={alert?.message}
            onConfirm={() => setAlert(null)}
          />
        </>
      }
    >
      <View>
        <View className="border-b border-theme-border-muted pb-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="오늘의 감정 선택"
            accessibilityState={{ expanded: picker === 'emotion', disabled: busy }}
            disabled={busy}
            onPress={() => {
              setDraftEmotion(emotion);
              setPicker('emotion');
            }}
            className="min-h-12 flex-row items-center gap-3 bg-transparent px-2 py-2 active:opacity-70"
          >
            <View className="h-14 w-14 items-center justify-center">
              {emotion !== null ? (
                <EmotionImage emotion={emotion} size={appRem * 3} />
              ) : (
                <AppIcon name="emoji-emotions" size={appRem * 2.75} color={colors.tertiary} />
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
        <View className="gap-3 pt-5">
          <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
            오늘의 이야기
          </Text>
          <View className="gap-3 p-2">
            <TextInput
              accessibilityLabel="일기 내용"
              multiline
              scrollEnabled
              value={text}
              onChangeText={setText}
              editable={!busy}
              maxLength={DIARY_TEXT_MAX_LENGTH}
              placeholder="기억하고 싶은 순간을 남겨보세요."
              placeholderTextColor={colors.tertiary}
              textAlignVertical="top"
              className={`h-[170px] ${FORM_TEXT_INPUT_CLASS_NAME}`}
            />
            <CharacterCount length={text.length} maxLength={DIARY_TEXT_MAX_LENGTH} />
          </View>
        </View>
      </View>
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
            오늘의 장면
          </Text>
          <Text className="text-xs text-theme-text-secondary">
            {images.length} / {DIARY_IMAGE_MAX_COUNT}장
          </Text>
        </View>
        <View className="p-2 gap-1">
          <Text className={BODY_DESCRIPTION_CLASS_NAME}>기억하고 싶은 장면을 남겨보세요.</Text>
          <DiaryFormImages
            images={images}
            busy={busy}
            picking={picking}
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
                    setAlert({ title: '사진을 추가하지 못했어요', message: error.message });
                })
                .finally(() => {
                  if (mounted.current) setPicking(false);
                });
            }}
          />
        </View>
      </View>
    </RecordFormLayout>
  );
}
