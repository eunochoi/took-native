import Storage from 'expo-sqlite/kv-store';

const COMPLETED_KEY = 'onboardingCompleted';

// Device-only storage: record backup/restore does not include this flag.
export async function hasCompletedOnboarding() {
  return (await Storage.getItemAsync(COMPLETED_KEY)) === 'true';
}

export async function completeOnboarding() {
  await Storage.setItemAsync(COMPLETED_KEY, 'true');
}
