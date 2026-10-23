import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Wordmark } from './Wordmark';

const cat = require('../../assets/cats/hiding-cat-home.png');
const catSize = Image.resolveAssetSource(cat);

export function AppLoadingScreen({
  onReady,
  onError,
}: {
  onReady: () => void;
  onError: (error: Error) => void;
}) {
  const [laidOut, setLaidOut] = useState(false);
  const [wordmarkReady, setWordmarkReady] = useState(false);
  const [catReady, setCatReady] = useState(false);
  useEffect(() => {
    if (laidOut && wordmarkReady && catReady) onReady();
  }, [laidOut, wordmarkReady, catReady, onReady]);

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-white"
      accessibilityLabel="TOOK 시작 화면"
      onLayout={() => setLaidOut(true)}
    >
      <StatusBar style="dark" />
      <Wordmark
        onLoad={() => setWordmarkReady(true)}
        onError={({ nativeEvent }) => onError(new Error(nativeEvent.error))}
      />
      <Image
        source={cat}
        className="absolute bottom-0 right-0 w-1/3"
        style={{ height: 'auto', aspectRatio: catSize.width / catSize.height }}
        resizeMode="contain"
        onLoadEnd={() => setCatReady(true)}
        accessible={false}
      />
    </View>
  );
}
