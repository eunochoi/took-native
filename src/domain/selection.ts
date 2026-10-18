export function selectionSummary(labels: string[], optionCount: number, allLabel = '전체') {
  return labels.length === 0 || labels.length === optionCount ? allLabel : labels.join(' · ');
}
