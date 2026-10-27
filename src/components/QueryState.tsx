import { useI18n } from '../i18n/react';
import { ActivityIndicator, View } from 'react-native';
import { QueryError } from './QueryError';

export function QueryState({
  query,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown };
}) {
  const { t } = useI18n();
  if (query.error) {
    return (
      <QueryError
        className="px-6"
        message={query.error.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  if (!query.isPending) return null;
  return (
    <View className="px-6 items-center">
      <ActivityIndicator accessibilityLabel={t('ui.loadingRecords')} />
    </View>
  );
}
