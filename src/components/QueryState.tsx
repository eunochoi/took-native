import { ActivityIndicator, View } from 'react-native';
import { QueryError } from './QueryError';

export function QueryState({
  query,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown };
}) {
  if (query.error) {
    return (
      <QueryError
        className="p-6"
        message={query.error.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  if (!query.isPending) return null;
  return (
    <View className="p-6 items-center">
      <ActivityIndicator accessibilityLabel="기록 불러오는 중" />
    </View>
  );
}
