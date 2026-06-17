import { useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Appearance } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion, applyTheme, currentTheme } from '../../shared/theme'
import { useAuth } from '../../hooks/useAuth'

const MOTYW_KEY = 'motyw'
const OPCJE_MOTYWU = [
  { id: 'system', label: 'Systemowy', icon: 'phone-portrait-outline' },
  { id: 'light', label: 'Jasny', icon: 'sunny-outline' },
  { id: 'dark', label: 'Ciemny', icon: 'moon-outline' },
]

export default function UstawieniaScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const [motyw, setMotyw] = useState('system')

  useEffect(() => {
    AsyncStorage.getItem(MOTYW_KEY).then(v => { if (v) setMotyw(v) })
  }, [])

  const zmienMotyw = (id) => {
    setMotyw(id)
    AsyncStorage.setItem(MOTYW_KEY, id)
    if (id === 'system') {
      applyTheme(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
    } else {
      applyTheme(id)
    }
  }

  const wyloguj = () => {
    Alert.alert('Wyloguj', 'Na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scrollContent}>
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
          <Pressable style={s.row} onPress={() => router.push('/rodzina')}>
            <Ionicons name="people-outline" size={20} color={t.text} />
            <Text style={s.rowLabel}>Rodzina</Text>
            <Ionicons name="chevron-forward" size={16} color={t.mute} />
          </Pressable>

          <View style={s.sep} />

          <Pressable style={s.row} onPress={() => router.push('/sloty')}>
            <Ionicons name="restaurant-outline" size={20} color={t.text} />
            <Text style={s.rowLabel}>Sloty posiłków</Text>
            <Ionicons name="chevron-forward" size={16} color={t.mute} />
          </Pressable>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Motyw</Text>
          <View style={s.motywRow}>
            {OPCJE_MOTYWU.map(o => {
              const aktywny = motyw === o.id
              return (
                <Pressable key={o.id} style={[s.motywBtn, aktywny && s.motywBtnAktywny]} onPress={() => zmienMotyw(o.id)}>
                  <Ionicons name={o.icon} size={18} color={aktywny ? '#fff' : t.mute} />
                  <Text style={[s.motywTxt, aktywny && s.motywTxtAktywny]}>{o.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={s.card}>
          <Pressable style={s.row} onPress={wyloguj}>
            <Ionicons name="log-out-outline" size={20} color={t.danger} />
            <Text style={[s.rowLabel, { color: t.danger }]}>Wyloguj się</Text>
          </Pressable>
        </View>

        <Text style={s.version}>Smakuje v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    scrollContent: { paddingBottom: 40 },
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
    cardTitle: {
      fontFamily: fonts.sans, fontSize: 11, fontWeight: '700', color: t.mute,
      letterSpacing: 1.2, textTransform: 'uppercase',
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    },
    motywRow: {
      flexDirection: 'row', gap: 8,
      paddingHorizontal: 12, paddingBottom: 14,
    },
    motywBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: 10,
      backgroundColor: t.surfaceAlt,
    },
    motywBtnAktywny: { backgroundColor: t.accent },
    motywTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.mute },
    motywTxtAktywny: { color: '#fff' },
    version: {
      fontFamily: fonts.sans, fontSize: 12, color: t.muteLight,
      textAlign: 'center', marginTop: 32,
    },
  })
}
