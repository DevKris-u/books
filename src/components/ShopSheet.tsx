import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Book } from '@/data/types';
import { offersFor, shopUrl } from '@/lib/utils';
import { useStore } from '@/state/store';
import { useColors } from '@/theme';
import { Rule, Sheet, Txt } from './ui';

export function ShopSheet({
  book,
  visible,
  onClose,
}: {
  book: Book | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const c = useColors();
  const [opened, setOpened] = useState<string | null>(null);
  if (!book) return null;

  const offers = offersFor(book);

  const open = async (shopId: string) => {
    dispatch({ type: 'SIGNAL_BUY', bookId: book.id });
    setOpened(shopId);
    const url = shopUrl(shopId, book, 'shop_sheet');
    try {
      await Linking.openURL(url);
    } catch {
      // The preview may block external navigation; the list stays usable.
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Gdzie kupić">
      <Txt variant="small" color={c.inkMid} style={{ marginBottom: 14, marginTop: -6 }}>
        {book.title} · {book.author}
      </Txt>

      {offers.map((shop, index) => (
        <View key={shop.id}>
          {index > 0 ? <Rule /> : null}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${shop.name}, ${shop.price.toFixed(2)} zł`}
            onPress={() => void open(shop.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 15,
              gap: 12,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={c.ink}>
                {shop.name}
              </Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                {shop.note}
              </Txt>
            </View>
            <Txt variant="label" color={c.ink}>
              {shop.price.toFixed(2).replace('.', ',')} zł
            </Txt>
            <Feather name="external-link" size={15} color={c.inkMid} />
          </Pressable>
        </View>
      ))}

      <Txt variant="small" color={c.inkSoft} style={{ marginTop: 14, lineHeight: 19 }}>
        {opened
          ? 'Otworzyliśmy sklep w przeglądarce. Margines nie sprzedaje książek i nie przetwarza płatności.'
          : 'Przejście do sklepu otworzy jego stronę w przeglądarce. Link afiliacyjny — Margines nie sprzedaje książek i nie przetwarza płatności.'}
      </Txt>

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        style={{ marginTop: 18, paddingVertical: 8 }}
      >
        <Txt variant="label" color={c.inkMid} align="center">
          Wróć
        </Txt>
      </Pressable>
    </Sheet>
  );
}
