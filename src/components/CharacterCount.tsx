import { Text } from './Text';

export function CharacterCount({ length, maxLength }: { length: number; maxLength: number }) {
  return (
    <Text className="text-right text-xs text-theme-text-tertiary">
      {length} / {maxLength}
    </Text>
  );
}
