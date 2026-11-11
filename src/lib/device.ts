import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY = 'margines:device-key';

/**
 * Stable, anonymous per-device id. It lets the app recognise the reader's own
 * posts without requiring an account, while every post still lives in Postgres.
 */
export async function getDeviceKey(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const generated = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(DEVICE_KEY, generated);
    return generated;
  } catch {
    return `dev-session-${Date.now().toString(36)}`;
  }
}
