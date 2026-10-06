import type { ComponentProps, ReactNode } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { BODY_DESCRIPTION_CLASS_NAME, TOP_SECTION_BORDER_CLASS_NAME } from '../theme/classes';
import { AppIcon } from './AppIcon';

import { twMerge } from 'tailwind-merge';
import { ColorView } from './ColorTransition';
import { Text } from './Text';

export function PageTopSection({
  title,
  description,
  image,
  imageLabel,
  imageAspectRatio,
  imageClassName = 'w-[28.5%]',
  children,
}: {
  title: string;
  icon: ComponentProps<typeof AppIcon>['name'];
  description: string;
  image: ImageSourcePropType;
  imageLabel: string;
  imageAspectRatio: number;
  imageClassName?: string;
  children?: ReactNode;
}) {
  return (
    <ColorView
      className={`relative h-[200px] shrink-0 bg-theme-accent-light ${TOP_SECTION_BORDER_CLASS_NAME}`}
    >
      <View className="z-10 px-[5%] min-w-0 flex-1 gap-6 justify-center">
        <View className='gap-2 items-start'>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-3xl font-bold leading-tight tracking-tight"
          >
            {title}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" className={twMerge(BODY_DESCRIPTION_CLASS_NAME, '')}>
            {description}
          </Text>
        </View>
        <View className="z-10">{children}</View>
      </View>
      <View pointerEvents="none" className="absolute inset-0">
        <Image
          source={image}
          accessibilityLabel={imageLabel}
          resizeMode="contain"
          className={`absolute bottom-0 right-0 ${imageClassName}`}
          style={{ height: 'auto', aspectRatio: imageAspectRatio }}
        />
      </View>
    </ColorView>
  );
}
