import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Cover, Field, IconBtn, Pill, Rule, Sheet, Txt } from '@/components/ui';
import { formatDate, initials, timeAgo } from '@/lib/utils';
import {
  favouriteGenres,
  favouriteTags,
  streakFrom,
  useStore,
} from '@/state/store';
import { colors, fonts, useColors } from '@/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const c = useColors();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [handle, setHandle] = useState(state.profile.handle);

  const read = state.library.filter((i) => i.shelf === 'read').length;
  const streak = streakFrom(state.activityDays);
  const genres = favouriteGenres(state, 3);
  const tags = favouriteTags(state, 3);

  const stats = [
    { label: 'przeczytane książki', value: read },
    { label: 'dodane fragmenty', value: state.posts.length },
    { label: 'polubione fragmenty', value: state.signals.likes },
    { label: 'dni z rzędu', value: streak },
  ];

  const styles = makeStyles(c);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 32 }}
      >
        <View style={styles.header}>
          <Txt style={styles.title}>Profil</Txt>
          <IconBtn
            name="settings"
            label="Ustawienia"
            size={40}
            onPress={() => router.push('/ustawienia')}
          />
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Txt style={styles.avatarText}>{initials(state.profile.name)}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={styles.name}>{state.profile.name}</Txt>
            <Txt variant="small" color={c.inkSoft}>
              @{state.profile.handle}
            </Txt>
            <Txt variant="micro" color={c.inkSoft} style={{ marginTop: 4 }}>
              w Marginesie od {formatDate(state.profile.joinedAt)}
            </Txt>
          </View>
          <Pressable
            onPress={() => {
              setName(state.profile.name);
              setHandle(state.profile.handle);
              setEditing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edytuj profil"
            style={styles.editBtn}
          >
            <Feather name="edit-3" size={14} color={c.inkMid} />
          </Pressable>
        </View>

        <View style={styles.stats}>
          {stats.map((stat, index) => (
            <View
              key={stat.label}
              style={[
                styles.statCell,
                index % 2 === 0 ? { borderRightWidth: StyleSheet.hairlineWidth } : null,
                index < 2 ? { borderBottomWidth: StyleSheet.hairlineWidth } : null,
              ]}
            >
              <Txt style={styles.statValue}>{stat.value}</Txt>
              <Txt variant="micro" color={c.inkSoft}>
                {stat.label}
              </Txt>
            </View>
          ))}
        </View>

        {state.pro ? (
          <View style={styles.proCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="zap" size={13} color={c.brass} />
              <Txt variant="meta" color={c.brass}>
                plan Pro
              </Txt>
            </View>
            <Txt style={styles.proTitle}>15 Hot Peaków na godzinę.</Txt>
            <Txt variant="small" color={c.onDarkSoft} style={{ marginTop: 4 }}>
              Bez reklam, z filtrami i rozszerzonymi statystykami.
            </Txt>
            <Pressable onPress={() => router.push('/pro')} style={styles.proLink}>
              <Txt variant="label" color={c.paper}>
                Zarządzaj subskrypcją
              </Txt>
              <Feather name="chevron-right" size={15} color={c.paper} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.upsell}>
            <View style={{ flex: 1 }}>
              <Txt variant="meta" color={c.brass}>
                margines pro
              </Txt>
              <Txt style={styles.upsellTitle}>Czytaj mądrzej, nie dłużej.</Txt>
              <Txt variant="small" color={c.inkMid} style={{ marginTop: 4 }}>
                15 Hot Peaków na godzinę zamiast jednego dziennie.
              </Txt>
            </View>
            <Pressable
              onPress={() => router.push('/pro')}
              style={styles.upsellBtn}
              accessibilityRole="button"
            >
              <Txt variant="label" color={c.onDark}>
                Przejdź na Pro
              </Txt>
            </Pressable>
          </View>
        )}

        {genres.length || tags.length ? (
          <View style={{ marginTop: 26 }}>
            {genres.length ? (
              <>
                <Txt variant="meta" color={c.inkSoft} style={{ marginBottom: 8 }}>
                  ulubione gatunki
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {genres.map((genre) => (
                    <Pill key={genre} label={genre} tone="brass" />
                  ))}
                </View>
              </>
            ) : null}
            {tags.length ? (
              <>
                <Txt
                  variant="meta"
                  color={c.inkSoft}
                  style={{ marginTop: 16, marginBottom: 8 }}
                >
                  ulubione emocje
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map((tag) => (
                    <Pill key={tag} label={tag} tone="claret" />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: 26 }}>
          <View style={styles.sectionHead}>
            <Txt style={styles.sectionTitle}>Moje fragmenty</Txt>
            <Txt variant="meta" color={c.inkSoft}>
              {state.posts.length} {state.posts.length === 1 ? 'wpis' : 'wpisów'}
            </Txt>
          </View>

          {state.posts.length === 0 ? (
            <View style={styles.postsEmpty}>
              <Txt variant="body" color={c.inkMid}>
                Jeszcze nic tu nie ma. Zrób zdjęcie strony, napisz jedną reakcję — to cała
                filozofia Marginesu.
              </Txt>
              <View style={{ height: 14 }} />
              <Btn
                label="Dodaj pierwszy fragment"
                variant="ghost"
                onPress={() => router.push('/dodaj')}
              />
            </View>
          ) : (
            state.posts.map((post, index) => {
              const book = state.books.find((b) => b.id === post.bookId);
              return (
                <View key={post.id}>
                  {index > 0 ? <Rule /> : null}
                  <View style={styles.post}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Cover book={book} width={34} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="small" color={c.inkSoft} numberOfLines={1}>
                          {book?.title ?? 'książka'} · {timeAgo(post.createdAt)}
                        </Txt>
                        <Txt
                          numberOfLines={2}
                          style={{ fontFamily: fonts.read, fontSize: 15, lineHeight: 22, marginTop: 4 }}
                        >
                          {post.text}
                        </Txt>
                        <Txt
                          variant="reaction"
                          color={c.claret}
                          numberOfLines={1}
                          style={{ fontSize: 14, marginTop: 6 }}
                        >
                          {post.reaction}
                        </Txt>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Feather name="heart" size={13} color={c.inkSoft} />
                        <Txt variant="micro" color={c.inkSoft}>
                          {post.likes}
                        </Txt>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <Pressable
            onPress={() => router.push('/ustawienia')}
            accessibilityRole="button"
            style={styles.linkRow}
          >
            <Feather name="settings" size={16} color={c.inkMid} />
            <Txt variant="label" style={{ flex: 1 }}>
              Ustawienia i powiadomienia
            </Txt>
            <Feather name="chevron-right" size={16} color={c.inkSoft} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/panel-wydawcy')}
            accessibilityRole="button"
            style={styles.linkRow}
          >
            <Feather name="briefcase" size={16} color={c.inkMid} />
            <Txt variant="label" style={{ flex: 1 }}>
              Panel wydawcy
            </Txt>
            <Feather name="chevron-right" size={16} color={c.inkSoft} />
          </Pressable>
        </View>

        <Txt variant="micro" color={c.inkSoft} style={{ marginTop: 26, lineHeight: 17 }}>
          Margines ma skończony feed i dzienny limit wpisów. Chcemy, żeby po kilku minutach
          zostało Ci coś do przeczytania — nie kolejny powód, żeby zostać w aplikacji.
        </Txt>
      </ScrollView>

      <Sheet
        visible={editing}
        onClose={() => setEditing(false)}
        title="Edytuj profil"
      >
        <Field label="Nazwa" value={name} onChangeText={setName} maxLength={40} />
        <View style={{ height: 14 }} />
        <Field
          label="Nazwa użytkownika"
          value={handle}
          onChangeText={(value) => setHandle(value.replace(/\s/g, '').toLowerCase())}
          maxLength={30}
          hint="Widoczna przy Twoich fragmentach."
        />
        <View style={{ height: 18 }} />
        <Btn
          label="Zapisz zmiany"
          disabled={!name.trim()}
          onPress={() => {
            dispatch({ type: 'UPDATE_PROFILE', name: name.trim(), handle: handle.trim() });
            setEditing(false);
          }}
        />
      </Sheet>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      paddingBottom: 16,
    },
    title: {
      fontFamily: fonts.semi,
      fontSize: 26,
      lineHeight: 32,
      color: c.ink,
      letterSpacing: -0.3,
    },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.forest,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(168,127,63,0.45)',
    },
    avatarText: { fontFamily: fonts.semi, fontSize: 20, color: c.onDark },
    name: { fontFamily: fonts.semi, fontSize: 21, lineHeight: 26, color: c.ink },
    editBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.rule,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.rule,
      borderRadius: 3,
      overflow: 'hidden',
    },
    statCell: {
      width: '50%',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderColor: c.rule,
      borderStyle: 'solid',
    },
    statValue: {
      fontFamily: fonts.semi,
      fontSize: 26,
      lineHeight: 32,
      color: c.ink,
    },
    proCard: {
      marginTop: 22,
      backgroundColor: c.forest,
      borderRadius: 3,
      padding: 16,
    },
    proTitle: { fontFamily: fonts.semi, fontSize: 18, lineHeight: 24, color: c.paper, marginTop: 8 },
    proLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
    upsell: {
      marginTop: 22,
      borderWidth: 1,
      borderColor: 'rgba(168,127,63,0.4)',
      backgroundColor: c.brassTint,
      borderRadius: 3,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    upsellTitle: {
      fontFamily: fonts.semi,
      fontSize: 17,
      lineHeight: 22,
      color: c.ink,
      marginTop: 5,
    },
    upsellBtn: {
      backgroundColor: c.forest,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 3,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitle: { fontFamily: fonts.semi, fontSize: 19, color: c.ink },
    postsEmpty: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.rule,
      paddingTop: 14,
    },
    post: { paddingVertical: 14 },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 15,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.rule,
    },
  });
}
