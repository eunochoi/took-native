import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useNavigation } from 'expo-router/react-navigation';

type Transition = { token: number; owner: string | null; phase: 'opening' | 'closing' };
interface ModalNavigation {
  openModal: (href: Href) => boolean;
  beginOpening: (owner: string) => number;
  beginClosing: (owner: string) => number | null;
  finishTransition: (owner: string, token: number) => void;
}
const ModalNavigationContext = createContext<ModalNavigation | null>(null);

export function ModalNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const transition = useRef<Transition | null>(null);
  const sequence = useRef(0);
  const value = useMemo<ModalNavigation>(
    () => ({
      openModal: (href) => {
        if (transition.current) return false;
        const pending = { token: ++sequence.current, owner: null, phase: 'opening' as const };
        transition.current = pending;
        try {
          router.push(href);
          return true;
        } catch (error) {
          if (transition.current === pending) transition.current = null;
          throw error;
        }
      },
      beginOpening: (owner) => {
        if (transition.current?.phase === 'opening' && transition.current.owner === null) {
          transition.current.owner = owner;
          return transition.current.token;
        }
        const token = ++sequence.current;
        transition.current = { token, owner, phase: 'opening' };
        return token;
      },
      beginClosing: (owner) => {
        if (transition.current) return null;
        const token = ++sequence.current;
        transition.current = { token, owner, phase: 'closing' };
        return token;
      },
      finishTransition: (owner, token) => {
        if (transition.current?.owner === owner && transition.current.token === token) {
          transition.current = null;
        }
      },
    }),
    [router],
  );
  return (
    <ModalNavigationContext.Provider value={value}>{children}</ModalNavigationContext.Provider>
  );
}

export function useModalTransition() {
  const context = useContext(ModalNavigationContext);
  if (!context) throw new Error('ModalNavigationProvider가 필요합니다.');
  return context;
}

export function useModalNavigation() {
  const { openModal } = useModalTransition();
  const navigation = useNavigation();
  return {
    openModal: (href: Href) => navigation.isFocused() && openModal(href),
  };
}
