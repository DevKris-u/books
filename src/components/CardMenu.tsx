import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Candidate } from '@/lib/recommend';
import { colors } from '@/theme';
import { Rule, Sheet, Txt } from './ui';

export function CardMenu({
  card,
  visible,
  onClose,
  onReport,
  onSave,
  onHideAuthor,
}: {
  card: Candidate | null;
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
  onSave: () => void;
  onHideAuthor: () => void;
}) {
  if (!card) return null;

  const rows: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    hint?: string;
    onPress: () => void;
    danger?: boolean;
  }[] = [
    {
      icon: 'clock',
      label: 'Zapisz na później',
      hint: 'trafi na półkę „Chcę przeczytać”',
      onPress: onSave,
    },
    {
      icon: 'eye-off',
      label: `Ukryj autora: ${card.book.author}`,
      hint: 'jego fragmenty nie pojawią się więcej w feedzie',
      onPress: onHideAuthor,
    },
    {
      icon: 'flag',
      label: 'Zgłoś naruszenie',
      hint: 'wpis zniknie z feedu do weryfikacji',
      onPress: onReport,
      danger: true,
    },
  ];

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Txt variant="meta" color={colors.inkSoft} style={{ marginBottom: 6 }}>
        {card.book.title}
      </Txt>
      {rows.map((row, index) => (
        <View key={row.label}>
          {index > 0 ? <Rule /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={row.label}
            onPress={row.onPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingVertical: 15,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Feather
              name={row.icon}
              size={17}
              color={row.danger ? colors.claret : colors.inkMid}
            />
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={row.danger ? colors.claret : colors.ink}>
                {row.label}
              </Txt>
              {row.hint ? (
                <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 2 }}>
                  {row.hint}
                </Txt>
              ) : null}
            </View>
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        style={{ paddingVertical: 14, marginTop: 6 }}
      >
        <Txt variant="label" color={colors.inkMid} align="center">
          Anuluj
        </Txt>
      </Pressable>
    </Sheet>
  );
}
