import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const wordmark = require('../../assets/ui/wordmark.png');
const cat = require('../../assets/cats/hiding-cat-home.png');
const wordmarkSize = Image.resolveAssetSource(wordmark);
const catSize = Image.resolveAssetSource(cat);

export function AppLoadingScreen({ onReady }: { onReady: () => void }) {
  const [laidOut, setLaidOut] = useState(false);
  const [wordmarkReady, setWordmarkReady] = useState(false);
  const [catReady, setCatReady] = useState(false);
  useEffect(() => {
    if (laidOut && wordmarkReady && catReady) onReady();
  }, [laidOut, wordmarkReady, catReady, onReady]);

  return (
    <View
      className="absolute inset-0 items-center justify-center bg-white"
      accessibilityLabel="took 시작 화면"
      onLayout={() => setLaidOut(true)}
    >
      <StatusBar style="dark" />
      <Image
        source={wordmark}
        className="w-1/4"
        style={{ height: 'auto', aspectRatio: wordmarkSize.width / wordmarkSize.height }}
        resizeMode="contain"
        onLoadEnd={() => setWordmarkReady(true)}
        accessible={false}
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
