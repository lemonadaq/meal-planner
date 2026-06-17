import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '../shared/supabase'
import { t, fonts, useThemeVersion } from '../shared/theme'

export default function LoginScreen() {
  const _v = useThemeVersion()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tryb, setTryb] = useState('login')

  async function submit() {
    setLoading(true)
    setError(null)

    const { error: err } = tryb === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (err) {
      setError(err.message)
    } else {
      router.replace('/(tabs)')
    }
    setLoading(false)
  }

  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
        <Text style={s.logo}>Smakuje</Text>
        <Text style={s.sub}>Planowanie posiłków dla rodziny</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={t.mute}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={s.input}
            placeholder="Hasło"
            placeholderTextColor={t.mute}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error && <Text style={s.error}>{error}</Text>}
          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={submit} disabled={loading}>
            <Text style={s.btnTxt}>{tryb === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}</Text>
          </Pressable>
          <Pressable onPress={() => setTryb(t => t === 'login' ? 'signup' : 'login')}>
            <Text style={s.switch}>
              {tryb === 'login' ? 'Nie masz konta? Zarejestruj się' : 'Masz konto? Zaloguj się'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    container: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
    logo: {
      fontFamily: fonts.serif, fontSize: 48, color: t.text,
      textAlign: 'center', marginBottom: 8,
    },
    sub: {
      fontFamily: fonts.sans, fontSize: 15, color: t.mute,
      textAlign: 'center', marginBottom: 40,
    },
    form: { gap: 12 },
    input: {
      backgroundColor: t.surface, borderRadius: 12, padding: 14,
      fontFamily: fonts.sans, fontSize: 16, color: t.text,
      borderWidth: 1, borderColor: t.border,
    },
    error: { fontFamily: fonts.sans, fontSize: 13, color: t.danger, textAlign: 'center' },
    btn: {
      backgroundColor: t.accent, borderRadius: 12, padding: 16,
      alignItems: 'center', marginTop: 8,
    },
    btnDisabled: { opacity: 0.5 },
    btnTxt: { fontFamily: fonts.sans, fontSize: 16, fontWeight: '600', color: '#fff' },
    switch: {
      fontFamily: fonts.sans, fontSize: 14, color: t.accent,
      textAlign: 'center', marginTop: 12,
    },
  })
}
