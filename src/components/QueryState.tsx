import { ActivityIndicator, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
export function QueryState({
  query,
}: {
  query: { isPending: boolean; error: Error | null; refetch: () => unknown };
}) {
  if (!query.isPending && !query.error) return null;
  return (
    <View className="p-6 gap-3 items-center">
      {query.error ? (
        <>
          <Text
            accessibilityRole="alert"
            className="text-center text-base text-theme-text-secondary"
          >
            {query.error.message}
          </Text>
          <Button
            label="다시 시도"
            onPress={() => {
              void query.refetch();
            }}
          />
        </>
      ) : (
        <ActivityIndicator accessibilityLabel="기록 불러오는 중" />
      )}
    </View>
  );
}
