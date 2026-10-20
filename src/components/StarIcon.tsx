import { StarIcon as PhosphorStarIcon } from 'phosphor-react-native/src/icons/Star';
import { cssInterop } from 'nativewind';

export function StarIcon({
  size,
  color = 'currentColor',
  filled = true,
}: {
  size: number;
  color?: string;
  className?: string;
  filled?: boolean;
}) {
  return <PhosphorStarIcon size={size} color={color} weight={filled ? 'fill' : 'regular'} />;
}

cssInterop(StarIcon, {
  className: { target: false, nativeStyleToProp: { color: true } },
});
