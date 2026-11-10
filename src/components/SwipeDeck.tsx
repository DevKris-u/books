import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Animated, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Candidate } from '@/lib/recommend';
import { useColors } from '@/theme';
import { FragmentCard } from './FragmentCard';
import { Txt } from './ui';
import { tapLike } from '@/lib/haptics';

export type SwipeDeckHandle = { swipe: (dir: 'like' | 'pass') => void };

type Props = {
  cards: Candidate[];
  onSwipe: (dir: 'like' | 'pass', card: Candidate, dwellMs: number) => void;
  onTap: (card: Candidate) => void;
  onHold: (card: Candidate) => void;
};

export const SwipeDeck = forwardRef<SwipeDeckHandle, Props>(function SwipeDeck(
  { cards, onSwipe, onTap, onHold },
  ref,
) {
  const { width, height } = useWindowDimensions();
  const position = useRef(new Animated.ValueXY()).current;
  const flying = useRef(false);
  const shownAt = useRef(Date.now());
  const top = cards[0];
  const c = useColors();

  useEffect(() => {
    shownAt.current = Date.now();
  }, [top?.id]);

  const complete = useCallback(
    (dir: 'like' | 'pass') => {
      if (!top || flying.current) return;
      flying.current = true;
      const x = dir === 'like' ? width + 140 : -width - 140;
      Animated.timing(position, {
        toValue: { x, y: dir === 'like' ? -20 : 20 },
        duration: 230,
        useNativeDriver: false,
      }).start(() => {
        const dwellMs = Date.now() - shownAt.current;
        position.setValue({ x: 0, y: 0 });
        flying.current = false;
        if (dir === 'like') void tapLike();
        onSwipe(dir, top, dwellMs);
      });
    },
    [onSwipe, position, top, width],
  );

  useImperativeHandle(ref, () => ({ swipe: complete }), [complete]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.1,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.35 });
      },
      onPanResponderRelease: (_, gesture) => {
        const threshold = Math.min(width * 0.26, 120);
        if (gesture.dx > threshold) complete('like');
        else if (gesture.dx < -threshold) complete('pass');
        else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 6,
            tension: 90,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, width * 0.22],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-width * 0.22, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (!top) return null;

  const styles = makeStyles(c);

  return (
    <View style={styles.deck}>
      {cards[1] ? (
        <View
          pointerEvents="none"
          style={[
            styles.behind,
            { height: height * 0.5 },
          ]}
        >
          <FragmentCard card={cards[1]} />
        </View>
      ) : null}

      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.top,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
      >
        <FragmentCard
          card={top}
          onPress={() => onTap(top)}
          onLongPress={() => onHold(top)}
        />

        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}
        >
          <Txt variant="meta" color={c.claret} style={{ fontSize: 13, letterSpacing: 1 }}>
            na półkę
          </Txt>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}
        >
          <Txt variant="meta" color={c.inkSoft} style={{ fontSize: 13, letterSpacing: 1 }}>
            pomiń
          </Txt>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    deck: { flex: 1, justifyContent: 'center' },
    behind: {
      position: 'absolute',
      left: 8,
      right: 8,
      top: 14,
      opacity: 0.55,
      transform: [{ scale: 0.975 }],
      alignItems: 'stretch',
    },
    top: { flex: 1 },
    stamp: {
      position: 'absolute',
      top: 22,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: 'rgba(248,242,231,0.92)',
    },
    stampLike: {
      left: 18,
      borderColor: 'rgba(142,47,54,0.55)',
      transform: [{ rotate: '-4deg' }],
    },
    stampPass: {
      right: 18,
      borderColor: c.rule,
      transform: [{ rotate: '4deg' }],
    },
  });
}
