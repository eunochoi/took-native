export const DIARY_SEASONS = {
  spring: { label: '봄', monthsLabel: '3~5월', months: [3, 4, 5] },
  summer: { label: '여름', monthsLabel: '6~8월', months: [6, 7, 8] },
  autumn: { label: '가을', monthsLabel: '9~11월', months: [9, 10, 11] },
  winter: { label: '겨울', monthsLabel: '12~다음 해 2월', months: [12, 1, 2] },
} as const;
export const DIARY_EMOTION_GROUPS = {
  positive: { label: '긍정', emotions: [0, 1, 2, 3], description: '행복, 기쁨\n사랑, 평온' },
  neutral: { label: '중립', emotions: [4, 9], description: '놀람, 무심' },
  negative: { label: '부정', emotions: [5, 6, 7, 8], description: '불안, 슬픔\n화남, 혼란' },
} as const;
export type DiarySeason = keyof typeof DIARY_SEASONS;
export type DiaryEmotionGroup = keyof typeof DIARY_EMOTION_GROUPS;

export function diaryPeriodLabel(year: number | null, seasons: DiarySeason[]) {
  if (!seasons.length) return year === null ? '전체 기간' : `${year}년 전체`;
  return (Object.keys(DIARY_SEASONS) as DiarySeason[])
    .filter((season) => seasons.includes(season))
    .map((season) => {
      const { label, months } = DIARY_SEASONS[season];
      if (year === null)
        return `${label} (${season === 'winter' ? '12~2' : `${months[0]}~${months[2]}`}월)`;
      return `${year}.${String(months[0]).padStart(2, '0')}~${season === 'winter' ? year + 1 : year}.${String(months[2]).padStart(2, '0')}`;
    })
    .join(' · ');
}
