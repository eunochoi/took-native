import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const splash = require('../../assets/ui/splash.png');

export function AppLoadingScreen({
  onReady,
  onError,
}: {
  onReady: () => void;
  onError: (error: Error) => void;
}) {
  const [laidOut, setLaidOut] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  useEffect(() => {
    if (laidOut && imageReady) onReady();
  }, [laidOut, imageReady, onReady]);

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-white"
      accessibilityLabel="TOOK 시작 화면"
      onLayout={() => setLaidOut(true)}
    >
      <StatusBar style="dark" />
      <Image
        source={splash}
        className="h-[240px] w-[240px]"
        resizeMode="contain"
        accessibilityLabel="TOOK"
        onLoad={() => setImageReady(true)}
        onError={({ nativeEvent }) => onError(new Error(nativeEvent.error))}
      />
    </View>
  );
}
