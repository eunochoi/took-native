import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const wordmark = require('../../assets/ui/wordmark.png');

export function AppLoadingScreen({
  onReady,
  onError,
}: {
  onReady: () => void;
  onError: (error: Error) => void;
}) {
  const [laidOut, setLaidOut] = useState(false);
  const [wordmarkReady, setWordmarkReady] = useState(false);
  useEffect(() => {
    if (laidOut && wordmarkReady) onReady();
  }, [laidOut, wordmarkReady, onReady]);

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-white"
      accessibilityLabel="TOOK 시작 화면"
      onLayout={() => setLaidOut(true)}
    >
      <StatusBar style="dark" />
      <Image
        source={wordmark}
        className="h-[200px] w-[200px]"
        resizeMode="contain"
        accessibilityLabel="TOOK"
        onLoad={() => setWordmarkReady(true)}
        onError={({ nativeEvent }) => onError(new Error(nativeEvent.error))}
      />
    </View>
  );
}
