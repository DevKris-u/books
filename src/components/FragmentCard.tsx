import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { fonts, type, useColors } from '@/theme';
import { Candidate } from '@/lib/recommend';
import { Cover, Pill, SourceMark, Txt } from './ui';

const cardPalette = [
  { fill: '#BFD2FF', accent: '#24479A' },
  { fill: '#D8F38A', accent: '#35551B' },
  { fill: '#F8B8DF', accent: '#8A2368' },
  { fill: '#FFD678', accent: '#82520A' },
  { fill: '#BDEDE0', accent: '#17665B' },
  { fill: '#FFC7A8', accent: '#873D27' },
] as const;

function paletteForBook(bookId: string) {
  const index = Array.from(bookId).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return cardPalette[index % cardPalette.length];
}

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
  const c = useColors();
  const cardTone = paletteForBook(card.book.id);
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
      <View
        pointerEvents="none"
        style={[
          styles.panel,
          {
            width: frame.width,
            height: frame.height,
            backgroundColor: cardTone.fill,
          },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="feather" size={11} color="#4C5B50" />
          <Txt variant="micro" color="#4C5B50">
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
              color="#172018"
              maxFontSizeMultiplier={1.2}
            >
              <Txt style={{ color: cardTone.accent, fontSize: 28, lineHeight: 32 }}>“</Txt>
              {card.text}
              <Txt style={{ color: cardTone.accent, fontSize: 16 }}>”</Txt>
            </Txt>
          </View>

          <View style={styles.reactionBlock}>
            <View style={[styles.reactionRule, { backgroundColor: cardTone.accent }]} />
            <View style={{ flex: 1 }}>
              <Txt
                variant="reaction"
                color={cardTone.accent}
                maxFontSizeMultiplier={1.2}
                numberOfLines={3}
              >
                {card.reaction}
              </Txt>
              <Txt variant="micro" color="#4C5B50" style={{ marginTop: 4 }}>
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
            style={{ fontFamily: fonts.semi, fontSize: 15, color: c.ink }}
          >
            {card.book.title}
          </Txt>
          <Txt variant="meta" color={c.inkSoft} style={{ marginTop: 2 }}>
            {card.book.author} · {card.book.genre}
          </Txt>
        </View>
        <Feather name="chevron-right" size={16} color={c.inkSoft} />
      </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    marginHorizontal: 2,
    ...Platform.select({
      web: { boxShadow: '0 18px 40px rgba(23, 32, 24, 0.18)' } as object,
      default: {
        shadowColor: '#172018',
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 7,
      },
    }),
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 28,
  },
  content: {
    flex: 1,
    padding: 26,
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
    paddingTop: 14,
  },
  column: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
    gap: 22,
    paddingBottom: 8,
  },
  fragmentWrap: {
    maxWidth: 420,
  },
  reactionBlock: {
    flexDirection: 'row',
    gap: 12,
    maxWidth: 420,
    paddingTop: 2,
  },
  reactionRule: {
    width: 4,
    borderRadius: 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(23, 32, 24, 0.18)',
  },
});
