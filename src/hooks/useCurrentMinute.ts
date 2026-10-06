import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useCurrentMinute() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      setNow(Date.now());
      timer = setTimeout(update, 60000 - Date.now() % 60000);
    };
    update();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
      else clearTimeout(timer);
    });
    return () => { clearTimeout(timer); listener.remove(); };
  }, []);
  return now;
}
