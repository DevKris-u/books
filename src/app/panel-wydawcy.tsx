import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Field, Rule, ScreenHeader, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { fonts, useColors } from '@/theme';

export default function PublisherPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const c = useColors();
  const [input, setInput] = useState('');
  const [report, setReport] = useState<number | null>(null);

  const excluded = state.books.filter((b) => b.source === 'excluded');

  const submit = () => {
    const titles = input
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!titles.length) return;
    titles.forEach((title) => dispatch({ type: 'EXCLUDE_TITLE', title }));
    setReport(titles.length);
    setInput('');
  };

  const styles = makeStyles(c);

  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title="Panel wydawcy"
            subtitle="Masowe wyłączenie tytułów z bazy Marginesu."
            onBack={() => router.back()}
          />

          <Txt variant="body" color={c.inkMid}>
            Wklej tytuły lub nazwiska autorów — po jednym w linii. Wszystkie fragmenty z tych
            książek znikną z feedu natychmiast, a książki dostaną status „wyłączona”. Zgłoszenie
            trafia do rejestru i jest potwierdzane w ciągu 48 godzin.
          </Txt>

          <View style={{ height: 18 }} />
          <Field
            label="Tytuły do wyłączenia"
            value={input}
            onChangeText={setInput}
            placeholder={'Cisza w bloku C\nJakub Reiter'}
            multiline
            style={{ minHeight: 110, textAlignVertical: 'top' }}
            hint="Możesz podać tytuł albo autora — dopasowujemy oba."
          />

          <View style={{ height: 14 }} />
          <Btn
            label="Zgłoś do wyłączenia"
            disabled={!input.trim()}
            onPress={submit}
          />

          {report !== null ? (
            <View style={styles.notice}>
              <Feather name="check" size={14} color={c.verified} />
              <Txt variant="small" color={c.inkMid} style={{ flex: 1 }}>
                Zgłoszenie przyjęte. Wyłączyliśmy dopasowane tytuły i wszystkie ich fragmenty.
              </Txt>
            </View>
          ) : null}

          <View style={{ marginTop: 26 }}>
            <View style={styles.sectionHead}>
              <Txt style={styles.sectionTitle}>Wyłączone w tej sesji</Txt>
              <Txt variant="meta" color={c.inkSoft}>
                {excluded.length}
              </Txt>
            </View>
            {excluded.length === 0 ? (
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
                Nic jeszcze nie zostało wyłączone.
              </Txt>
            ) : (
              excluded.map((book, index) => (
                <View key={book.id}>
                  {index > 0 ? <Rule /> : null}
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Txt variant="label">{book.title}</Txt>
                      <Txt variant="small" color={c.inkSoft}>
                        {book.author}
                      </Txt>
                    </View>
                    <Txt variant="micro" color={c.claret}>
                      wyłączona
                    </Txt>
                  </View>
                </View>
              ))
            )}
          </View>

          <Txt variant="micro" color={c.inkSoft} style={{ marginTop: 26, lineHeight: 17 }}>
            Rejestr zgłoszeń i usunięć (kto, kiedy, czego dotyczyło) jest dostępny w panelu
            administracyjnym. Ten ekran jest prototypem — w wersji produkcyjnej wymaga
            zalogowania na konto wydawcy.
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    notice: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      marginTop: 14,
      backgroundColor: c.forestTint,
      padding: 12,
      borderRadius: 3,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: c.rule,
      paddingBottom: 8,
    },
    sectionTitle: { fontFamily: fonts.semi, fontSize: 19, color: c.ink },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  });
}
