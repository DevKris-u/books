import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Native haptics only; the web preview has no vibration hardware. */
export async function tapLight() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export async function tapLike() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Haptics.selectionAsync();
  } catch {}
}

export async function tapWarn() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}
