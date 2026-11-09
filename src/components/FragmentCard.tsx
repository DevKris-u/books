import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, fonts, type } from '@/theme';
import { Candidate } from '@/lib/recommend';
import { ScallopedPanel } from './ScallopedPanel';
import { Cover, Pill, SourceMark, Txt } from './ui';

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
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={380}
      onLayout={(event) => {
        const { width, height: cardHeight } = event.nativeEvent.layout;
        setFrame((prev) =>
          prev.width === width && prev.height === cardHeight
            ? prev
            : { width, height: cardHeight },
        );
      }}
      accessibilityRole="button"
      accessibilityLabel={`Fragment z książki ${card.book.title}. Kliknij, aby zobaczyć książkę, przytrzymaj, aby otworzyć menu.`}
      style={({ pressed }) => [
        styles.card,
        Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null,
        pressed ? { opacity: 0.97 } : null,
      ]}
    >
      <ScallopedPanel
        width={frame.width}
        height={frame.height}
        fill={colors.forestTint}
        style={styles.panel}
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="feather" size={11} color={colors.inkSoft} />
          <Txt variant="micro" color={colors.inkSoft}>
            {card.page ? `strona ${card.page}` : 'fragment'}
          </Txt>
        </View>
        <SourceMark source={card.book.source} />
      </View>

      <View style={styles.body}>
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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
    padding: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 12,
  },
  column: {
    flex: 1,
    paddingRight: 14,
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 8,
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
    paddingVertical: 10,
  },
});
