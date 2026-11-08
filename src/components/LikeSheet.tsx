import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Candidate } from '@/lib/recommend';
import { useStore } from '@/state/store';
import { colors } from '@/theme';
import { Btn, Cover, Sheet, SourceMark, Txt } from './ui';

export function LikeSheet({
  card,
  visible,
  mode = 'feed',
  onClose,
  onShops,
  onSimilar,
}: {
  card: Candidate | null;
  visible: boolean;
  mode?: 'feed' | 'hot';
  onClose: () => void;
  onShops: () => void;
  onSimilar: () => void;
}) {
  const { state, dispatch } = useStore();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!visible) setAdded(false);
  }, [visible]);

  if (!card) return null;
  const { book } = card;
  const onShelf = state.library.some((i) => i.bookId === book.id);
  const saved = added || onShelf;

  const add = () => {
    dispatch({ type: 'ADD_TO_WANT', bookId: book.id });
    setAdded(true);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 18 }}>
        <Cover book={book} width={54} />
        <View style={{ flex: 1, justifyContent: 'center', gap: 3 }}>
          <Txt variant="meta" color={colors.inkSoft}>
            {mode === 'hot' ? 'Hot Peak · wybrane dla Ciebie' : 'fragment zapisany'}
          </Txt>
          <Txt
            numberOfLines={2}
            style={{ color: colors.ink, fontFamily: 'Literata_600SemiBold', fontSize: 19, lineHeight: 24 }}
          >
            {book.title}
          </Txt>
          <Txt variant="small" color={colors.inkMid}>
            {book.author}
          </Txt>
        </View>
      </View>

      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: 'rgba(142,47,54,0.4)',
          paddingLeft: 12,
          marginBottom: 20,
        }}
      >
        <Txt variant="reaction" color={colors.claret} numberOfLines={2}>
          {card.reaction}
        </Txt>
        <Txt variant="micro" color={colors.inkSoft} style={{ marginTop: 5 }}>
          Twoja reakcja zostaje przy fragmencie
        </Txt>
      </View>

      {mode === 'hot' ? (
        <>
          <Btn label="Zobacz, gdzie kupić" icon="external-link" onPress={onShops} />
          <View style={{ height: 10 }} />
          <Btn
            label={saved ? 'Jest na Twojej półce' : 'Dodaj do „Chcę przeczytać”'}
            variant="ghost"
            icon={saved ? 'check' : 'bookmark'}
            onPress={add}
          />
          <View style={{ height: 10 }} />
          <Btn label="Wróć do feedu" variant="quiet" onPress={onClose} />
        </>
      ) : (
        <>
          <Btn
            label={saved ? 'Jest na Twojej półce' : 'Dodaj do „Chcę przeczytać”'}
            icon={saved ? 'check' : 'bookmark'}
            onPress={add}
          />
          <View style={{ height: 10 }} />
          <Btn
            label="Zobacz, gdzie kupić"
            variant="ghost"
            icon="shopping-bag"
            onPress={onShops}
          />
          <View style={{ height: 10 }} />
          <Btn
            label="Pokaż podobne fragmenty"
            variant="ghost"
            icon="layers"
            onPress={onSimilar}
          />
          <View style={{ height: 8 }} />
          <Btn label="Nie teraz, wracam do feedu" variant="quiet" onPress={onClose} />
        </>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
        }}
      >
        <SourceMark source={book.source} showLabel />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="book" size={11} color={colors.inkSoft} />
          <Txt variant="micro" color={colors.inkSoft}>
            {book.pages} str.
          </Txt>
        </View>
      </View>
    </Sheet>
  );
}
