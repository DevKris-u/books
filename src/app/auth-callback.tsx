import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Txt } from '@/components/ui';
import { consumeAuthNext } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fonts, useColors } from '@/theme';

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function AuthCallbackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const c = useColors();

  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('Nie udało się dokończyć logowania.');

  const code = one(params.code);
  const error = one(params.error);
  const errorDescription = one(params.error_description);

  useEffect(() => {
    let active = true;

    (async () => {
      const next = await consumeAuthNext();
      if (!active) return;

      if (error) {
        setMessage(errorDescription || 'Google przerwał logowanie. Spróbuj ponownie.');
        setFailed(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        router.replace(next);
        return;
      }

      if (!code) {
        setMessage('Brakuje kodu logowania. Spróbuj ponownie.');
        setFailed(true);
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;
      if (exchangeError) {
        setMessage('Sesja logowania wygasła. Spróbuj jeszcze raz.');
        setFailed(true);
        return;
      }

      router.replace(next);
    })();

    return () => {
      active = false;
    };
  }, [code, error, errorDescription, router]);

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: c.paper,
          paddingTop: insets.top,
          paddingHorizontal: 26,
        },
      ]}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
        <Txt
          style={{
            fontFamily: fonts.semi,
            fontSize: 17,
            color: c.inkSoft,
            letterSpacing: -0.2,
            marginBottom: 30,
          }}
        >
          margines
        </Txt>

        {failed ? (
          <>
            <Txt
              style={{
                fontFamily: fonts.semi,
                fontSize: 28,
                lineHeight: 35,
                letterSpacing: -0.4,
                color: c.ink,
              }}
            >
              Logowanie nie wyszło.
            </Txt>
            <Txt variant="body" color={c.inkMid} style={{ marginTop: 10, maxWidth: 320 }}>
              {message}
            </Txt>
            <View style={{ alignSelf: 'stretch', marginTop: 28, gap: 10 }}>
              <Btn label="Spróbuj ponownie" onPress={() => router.replace('/logowanie')} />
              <Btn
                label="Wróć do feedu"
                variant="ghost"
                onPress={() => router.replace('/')}
              />
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator color={c.claret} />
            <Txt
              style={{
                fontFamily: fonts.semi,
                fontSize: 28,
                lineHeight: 35,
                letterSpacing: -0.4,
                color: c.ink,
                marginTop: 22,
              }}
            >
              Dokańczamy logowanie…
            </Txt>
            <Txt variant="body" color={c.inkMid} style={{ marginTop: 10, maxWidth: 320 }}>
              Za chwilę wrócisz do Marginesu. Nie zamykaj tej karty.
            </Txt>
          </>
        )}
      </View>
    </View>
  );
}
