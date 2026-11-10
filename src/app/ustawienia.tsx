import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Field, Rule, ScreenHeader, Sheet, Toggle, Txt } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { hotPeakStatus, NotificationKey, useStore } from '@/state/store';
import { fonts, useColors } from '@/theme';

const NOTIFICATIONS: { key: NotificationKey; label: string; hint: string }[] = [
  {
    key: 'hotPeak',
    label: 'Nowy Hot Peak czeka',
    hint: 'raz dziennie w planie darmowym, rano w Pro',
  },
  {
    key: 'likes',
    label: 'Ktoś polubił Twój fragment',
    hint: 'zbiorczo raz dziennie, żeby nie przerywać czytania',
  },
  {
    key: 'readingGoal',
    label: 'Nie zapomnij o dzisiejszym czytaniu',
    hint: 'tylko jeśli masz ustawiony cel i nie odznaczysz postępu',
  },
  {
    key: 'newFragments',
    label: 'Nowe fragmenty w ulubionym gatunku',
    hint: 'gdy pojawi się ich kilka, nie pojedynczo',
  },
  {
    key: 'streak',
    label: 'Twoja seria dni z rzędu jest zagrożona',
    hint: 'wieczorem, jeśli nie było Cię w aplikacji',
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const c = useColors();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [handle, setHandle] = useState(state.profile.handle);
  const [confirm, setConfirm] = useState<'logout' | 'delete' | null>(null);

  const hot = hotPeakStatus(state);

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: c.paper }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}>
        <ScreenHeader title="Ustawienia" onBack={() => router.back()} />

        <Section title="Profil">
          <Pressable
            onPress={() => {
              setName(state.profile.name);
              setHandle(state.profile.handle);
              setEditing(true);
            }}
            accessibilityRole="button"
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="label">Edycja profilu</Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                {state.profile.name} · @{state.profile.handle}
              </Txt>
            </View>
            <Feather name="chevron-right" size={16} color={c.inkSoft} />
          </Pressable>
          <Row
            label="Dołączenie"
            value={formatDate(state.profile.joinedAt)}
            last
          />
        </Section>

        <Section title="Powiadomienia">
          {NOTIFICATIONS.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.row,
                index === NOTIFICATIONS.length - 1 ? null : styles.rowBorder,
              ]}
            >
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Txt variant="label">{item.label}</Txt>
                <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                  {item.hint}
                </Txt>
              </View>
              <Toggle
                label={item.label}
                value={state.notifications[item.key]}
                onChange={() => dispatch({ type: 'TOGGLE_NOTIFICATION', key: item.key })}
              />
            </View>
          ))}
        </Section>

        <Section title="Subskrypcja">
          <Pressable
            onPress={() => router.push('/pro')}
            accessibilityRole="button"
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Txt variant="label">{state.pro ? 'Plan Pro' : 'Plan darmowy'}</Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                {state.pro
                  ? '15 Hot Peaków na godzinę · odnawia się za 24 dni'
                  : '1 Hot Peak dziennie · reklamy opcjonalne'}
              </Txt>
            </View>
            <Txt variant="meta" color={c.claret}>
              zarządzaj
            </Txt>
          </Pressable>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Txt variant="label">Historia reklam</Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                obejrzane: {state.adsWatchedTotal} · dziś: {hot.adsToday}/3 · odblokowane
                Hot Peaki: {hot.adsToday}
              </Txt>
            </View>
          </View>
        </Section>

        <Section title="Wygląd">
          <View style={[styles.row, styles.rowBorder]}>
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Txt variant="label">Motyw aplikacji</Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                {state.theme === 'dark' ? 'Ciemny' : 'Jasny'}
              </Txt>
            </View>
            <Toggle
              label="Ciemny"
              value={state.theme === 'dark'}
              onChange={() =>
                dispatch({ type: 'SET_THEME', theme: state.theme === 'dark' ? 'light' : 'dark' })
              }
            />
          </View>
        </Section>

        <Section title="Konto">
          <Pressable
            onPress={() => setConfirm('logout')}
            accessibilityRole="button"
            style={styles.row}
          >
            <Txt variant="label" style={{ flex: 1 }}>
              Wyloguj
            </Txt>
            <Feather name="log-out" size={16} color={c.inkMid} />
          </Pressable>
          <Pressable
            onPress={() => setConfirm('delete')}
            accessibilityRole="button"
            style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.rule }]}
          >
            <Txt variant="label" color={c.claret} style={{ flex: 1 }}>
              Usuń konto
            </Txt>
            <Feather name="trash-2" size={16} color={c.claret} />
          </Pressable>
        </Section>

        <Txt variant="micro" color={c.inkSoft} style={{ marginTop: 26, lineHeight: 17 }}>
          Powiadomienia są opcjonalne. Margines nie wysyła ich częściej niż raz dziennie, a
          wszystkie możesz wyłączyć w każdej chwili.
        </Txt>
      </ScrollView>

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Edycja profilu">
        <Field label="Nazwa" value={name} onChangeText={setName} maxLength={40} />
        <View style={{ height: 14 }} />
        <Field
          label="Nazwa użytkownika"
          value={handle}
          onChangeText={(value) => setHandle(value.replace(/\s/g, '').toLowerCase())}
          maxLength={30}
        />
        <View style={{ height: 18 }} />
        <Btn
          label="Zapisz"
          disabled={!name.trim()}
          onPress={() => {
            dispatch({ type: 'UPDATE_PROFILE', name: name.trim(), handle: handle.trim() });
            setEditing(false);
          }}
        />
      </Sheet>

      <Sheet visible={!!confirm} onClose={() => setConfirm(null)}>
        <Txt variant="title" style={{ marginBottom: 8 }}>
          {confirm === 'delete' ? 'Usunąć konto?' : 'Wylogować się?'}
        </Txt>
        <Txt variant="body" color={c.inkMid} style={{ marginBottom: 20 }}>
          {confirm === 'delete'
            ? 'Usuniemy Twoje wpisy, bibliotekę i preferencje. Tej operacji nie można cofnąć.'
            : 'Wrócisz do ekranu powitalnego. Twoje półki i wpisy zostaną na urządzeniu.'}
        </Txt>
        <Btn
          label={confirm === 'delete' ? 'Usuń konto' : 'Wyloguj'}
          variant="accent"
          onPress={() => {
            const mode = confirm;
            setConfirm(null);
            if (mode === 'delete') {
              dispatch({ type: 'RESET' });
            } else {
              dispatch({ type: 'LOGOUT' });
            }
            router.replace('/onboarding');
          }}
        />
        <View style={{ height: 10 }} />
        <Btn label="Zostaw mnie tutaj" variant="quiet" onPress={() => setConfirm(null)} />
      </Sheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginTop: 22 }}>
      <Txt variant="meta" color={c.inkSoft} style={{ marginBottom: 8 }}>
        {title.toLowerCase()}
      </Txt>
      <View style={[styles.section, { borderColor: c.rule }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.row, last ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.ruleSoft }]}>
      <Txt variant="label" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="small" color={c.inkSoft}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
