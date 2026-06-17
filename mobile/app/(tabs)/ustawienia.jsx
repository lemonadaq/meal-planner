import { View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion } from '../../shared/theme'
import { useAuth } from '../../hooks/useAuth'

export default function UstawieniaScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()

  const wyloguj = () => {
    Alert.alert('Wyloguj', 'Na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.tytul}>Ustawienia</Text>

      <View style={s.card}>
        <View style={s.row}>
          <Ionicons name="person-outline" size={20} color={t.text} />
          <View style={s.rowInfo}>
            <Text style={s.rowLabel}>Konto</Text>
            <Text style={s.rowValue}>{user?.email || '—'}</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Pressable style={s.row} onPress={() => {}}>
          <Ionicons name="people-outline" size={20} color={t.text} />
          <Text style={s.rowLabel}>Rodzina</Text>
          <Ionicons name="chevron-forward" size={16} color={t.mute} />
        </Pressable>

        <View style={s.sep} />

        <Pressable style={s.row} onPress={() => {}}>
          <Ionicons name="restaurant-outline" size={20} color={t.text} />
          <Text style={s.rowLabel}>Sloty posiłków</Text>
          <Ionicons name="chevron-forward" size={16} color={t.mute} />
        </Pressable>
      </View>

      <View style={s.card}>
        <Pressable style={s.row} onPress={wyloguj}>
          <Ionicons name="log-out-outline" size={20} color={t.danger} />
          <Text style={[s.rowLabel, { color: t.danger }]}>Wyloguj się</Text>
        </Pressable>
      </View>

      <Text style={s.version}>Smakuje v1.0.0</Text>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    tytul: {
      fontFamily: fonts.serif, fontSize: 30, color: t.text,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    },
    card: {
      backgroundColor: t.surface, borderRadius: 14,
      marginHorizontal: 16, marginBottom: 12,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 16,
    },
    rowInfo: { flex: 1, gap: 2 },
    rowLabel: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '500', color: t.text, flex: 1 },
    rowValue: { fontFamily: fonts.sans, fontSize: 13, color: t.mute },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 48 },
    version: {
      fontFamily: fonts.sans, fontSize: 12, color: t.muteLight,
      textAlign: 'center', marginTop: 32,
    },
  })
}
