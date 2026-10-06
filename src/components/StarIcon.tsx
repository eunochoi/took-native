import Svg, { Path } from 'react-native-svg';
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
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3 14.78 8.63 21 9.54 16.5 13.93 17.56 20.13 12 17.2 6.44 20.13 7.5 13.93 3 9.54 9.22 8.63Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

cssInterop(StarIcon, {
  className: { target: false, nativeStyleToProp: { color: true } },
});
