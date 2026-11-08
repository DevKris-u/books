import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, fonts, radius, space, type } from '@/theme';
import { Candidate } from '@/lib/recommend';
import { Cover, Pill, Rule, SourceMark, Txt } from './ui';

function readingSize(length: number, height: number) {
  let size = 23;
  if (length > 380) size = 17;
  else if (length > 280) size = 18.5;
  else if (length > 200) size = 20;
  else if (length > 120) size = 21.5;
  if (height < 700) size -= 1.5;
  return { fontSize: size, lineHeight: Math.round(size * 1.55) };
}

export function FragmentCard({
  card,
  onPress,
  onLongPress,
}: {
  card: Candidate;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { height } = useWindowDimensions();
  const reading = readingSize(card.text.length, height);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={380}
      accessibilityRole="button"
      accessibilityLabel={`Fragment z książki ${card.book.title}. Kliknij, aby zobaczyć książkę, przytrzymaj, aby otworzyć menu.`}
      style={({ pressed }) => [
        styles.card,
        Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null,
        pressed ? { opacity: 0.97 } : null,
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="feather" size={11} color={colors.inkSoft} />
          <Txt variant="micro" color={colors.inkSoft}>
            {card.page ? `strona ${card.page}` : 'fragment'}
          </Txt>
        </View>
        <SourceMark source={card.book.source} />
      </View>

      <Rule color={colors.ruleSoft} />

      <View style={styles.body}>
        <View style={styles.margin}>
          <View style={styles.marginRule} />
          <View style={styles.marginDot} />
        </View>

        <View style={styles.column}>
          <View style={styles.fragmentWrap}>
            <Txt
              style={[type.reading, reading]}
              color={colors.ink}
              maxFontSizeMultiplier={1.2}
            >
              {card.text}
            </Txt>
          </View>

          <View style={styles.reactionBlock}>
            <View style={styles.reactionRule} />
            <View style={{ flex: 1 }}>
              <Txt
                variant="reaction"
                color={colors.claret}
                maxFontSizeMultiplier={1.2}
                numberOfLines={3}
              >
                {card.reaction}
              </Txt>
              <Txt variant="micro" color={colors.inkSoft} style={{ marginTop: 4 }}>
                {card.curator.handle}
              </Txt>
            </View>
          </View>

          <View style={styles.tags}>
            {card.tags.map((tag) => (
              <Pill key={tag} label={tag} small tone="claret" />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Cover book={card.book} width={30} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Txt
            numberOfLines={1}
            style={{ fontFamily: fonts.semi, fontSize: 15, color: colors.ink }}
          >
            {card.book.title}
          </Txt>
          <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 2 }}>
            {card.book.author} · {card.book.genre}
          </Txt>
        </View>
        <Feather name="chevron-right" size={16} color={colors.inkSoft} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.paperSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(27,22,17,0.14)',
    paddingTop: 16,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 22,
  },
  margin: {
    width: 30,
    alignItems: 'center',
  },
  marginRule: {
    position: 'absolute',
    top: 2,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(142,47,54,0.28)',
  },
  marginDot: {
    marginTop: 8,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.claret,
  },
  column: {
    flex: 1,
    paddingRight: 22,
    justifyContent: 'center',
    gap: 18,
    paddingBottom: 16,
  },
  fragmentWrap: {
    maxWidth: 420,
  },
  reactionBlock: {
    flexDirection: 'row',
    gap: 12,
    maxWidth: 420,
  },
  reactionRule: {
    width: 2,
    backgroundColor: 'rgba(142,47,54,0.45)',
    borderRadius: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.rule,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(231,219,198,0.35)',
  },
});
