import {
  DIARY_IMAGE_MAX_COUNT,
  IMAGE_SOURCE_MAX_BYTES,
  IMAGE_MAX_EDGE,
  IMAGE_JPEG_QUALITY,
} from '../domain/limits';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { SQLiteDatabase } from 'expo-sqlite';
import { saveDiary, type DiaryInput } from '../db/diary';
import { withWriteLock } from '../db';

const mediaDirectory = new Directory(Paths.document, 'media');
export const validFileName = (name: string) => /^[a-zA-Z0-9_-]+\.jpg$/.test(name);
export const mediaFile = (name: string) => {
  if (!validFileName(name)) throw new Error('사진 파일명이 올바르지 않습니다.');
  return new File(mediaDirectory, name);
};
export const mediaUri = (name: string) => mediaFile(name).uri;
export interface DraftImage {
  file: string;
  uri: string;
  temporary?: boolean;
}
export async function initializeMedia(db: SQLiteDatabase) {
  mediaDirectory.create({ intermediates: true, idempotent: true });
  const referenced = new Set(
    (await db.getAllAsync<{ file_name: string }>('SELECT file_name FROM diary_images')).map(
      (row) => row.file_name,
    ),
  );
  for (const file of mediaDirectory.list()) {
    if (file instanceof File && !referenced.has(file.name)) {
      try {
        file.delete();
      } catch {
        /* Retry orphan cleanup on the next launch. */
      }
    }
  }
}
export async function pickImages(remaining: number): Promise<DraftImage[]> {
  if (remaining < 1)
    throw new Error(`사진은 최대 ${DIARY_IMAGE_MAX_COUNT}개까지 추가할 수 있습니다.`);
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return [];
  const images: DraftImage[] = [];
  try {
    for (const asset of result.assets.slice(0, remaining)) {
      if ((asset.fileSize ?? new File(asset.uri).size ?? 0) > IMAGE_SOURCE_MAX_BYTES)
        throw new Error(
          `사진은 한 장당 ${IMAGE_SOURCE_MAX_BYTES / 1024 / 1024}MB까지 선택할 수 있습니다.`,
        );
      const context = ImageManipulator.manipulate(asset.uri);
      if (Math.max(asset.width, asset.height) > IMAGE_MAX_EDGE)
        context.resize(
          asset.width >= asset.height ? { width: IMAGE_MAX_EDGE } : { height: IMAGE_MAX_EDGE },
        );
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: IMAGE_JPEG_QUALITY,
      });
      images.push({
        file: `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
        uri: saved.uri,
        temporary: true,
      });
      rendered.release();
      context.release();
    }
    return images;
  } catch (error) {
    discardDraftImages(images);
    throw error;
  }
}
export function discardDraftImages(images: DraftImage[]) {
  for (const image of images)
    if (image.temporary) {
      try {
        const file = new File(image.uri);
        if (file.exists) file.delete();
      } catch {
        /* Cache will be reclaimed by the OS. */
      }
    }
}
export const cleanupImages = (db: SQLiteDatabase, files: string[]) =>
  withWriteLock(async () => {
    for (const name of files) {
      if (await db.getFirstAsync('SELECT id FROM diary_images WHERE file_name = ?', name)) continue;
      try {
        const file = mediaFile(name);
        if (file.exists) file.delete();
      } catch {
        /* Orphan cleanup retries on launch. */
      }
    }
  }).catch(() => undefined);
export async function saveDiaryImages(
  db: SQLiteDatabase,
  input: Omit<DiaryInput, 'files'>,
  images: DraftImage[],
) {
  const copied: string[] = [];
  try {
    for (const image of images) {
      if (image.temporary) {
        await new File(image.uri).copy(mediaFile(image.file));
        copied.push(image.file);
      } else if (!mediaFile(image.file).exists) throw new Error('사진 파일을 찾을 수 없습니다.');
    }
    const result = await saveDiary(db, { ...input, files: images.map((image) => image.file) });
    await cleanupImages(db, result.removed);
    discardDraftImages(images);
    return result.id;
  } catch (error) {
    await cleanupImages(db, copied);
    throw error;
  }
}
