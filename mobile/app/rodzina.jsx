import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../shared/supabase'
import { t, fonts, useThemeVersion } from '../shared/theme'
import { useAuth } from '../hooks/useAuth'

export default function RodzinaScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState(null)
  const [czlonkowie, setCzlonkowie] = useState([])
  const [zaproszenia, setZaproszenia] = useState([])
  const [mojeZaproszenia, setMojeZaproszenia] = useState([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('household_members').select('household_id')
      .eq('user_id', user.id).limit(1).single()
      .then(({ data }) => { if (data) setHouseholdId(data.household_id) })
  }, [user])

  const pobierz = useCallback(async () => {
    if (!householdId) return
    const [{ data: czl }, { data: zapr }, { data: moje }] = await Promise.all([
      supabase.from('household_members_view').select('*'),
      supabase.from('household_invites').select('*')
        .eq('household_id', householdId).eq('status', 'pending'),
      supabase.from('moje_zaproszenia_view').select('*'),
    ])
    setCzlonkowie(czl || [])
    setZaproszenia(zapr || [])
    setMojeZaproszenia((moje || []).filter(z => z.status === 'pending'))
    setLoading(false)
  }, [householdId])

  useEffect(() => { pobierz() }, [pobierz])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await pobierz()
    setRefreshing(false)
  }, [pobierz])

  const zapros = async () => {
    const trimEmail = email.trim().toLowerCase()
    if (!trimEmail || !trimEmail.includes('@')) {
      Alert.alert('Błąd', 'Podaj poprawny adres email')
      return
    }
    setSending(true)
    const { error } = await supabase.rpc('zapros_do_household', { p_email: trimEmail })
    if (error) {
      Alert.alert('Błąd', error.message || 'Nie udało się wysłać zaproszenia')
    } else {
      Alert.alert('Wysłano', `Zaproszenie wysłane do ${trimEmail}`)
      setEmail('')
      await pobierz()
    }
    setSending(false)
  }

  const anulujZaproszenie = async (id) => {
    await supabase.rpc('anuluj_zaproszenie', { p_invite_id: id })
    await pobierz()
  }

  const akceptujZaproszenie = async (id) => {
    const { error } = await supabase.rpc('zaakceptuj_zaproszenie', { p_invite_id: id })
    if (error) {
      Alert.alert('Błąd', error.message)
    } else {
      Alert.alert('Gotowe', 'Dołączono do rodziny!')
      const { data } = await supabase.from('household_members').select('household_id')
        .eq('user_id', user.id).limit(1).single()
      if (data) setHouseholdId(data.household_id)
      await pobierz()
    }
  }

  const odrzucZaproszenie = async (id) => {
    await supabase.rpc('odrzuc_zaproszenie', { p_invite_id: id })
    await pobierz()
  }

  const usunCzlonka = (userId, nazwa) => {
    if (userId === user.id) return
    Alert.alert('Usuń', `Usunąć ${nazwa} z rodziny?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        await supabase.rpc('usun_z_household', { p_user_id: userId })
        await pobierz()
      }},
    ])
  }

  const opusc = () => {
    Alert.alert('Opuść rodzinę', 'Na pewno? Twoje dane zostaną w osobnym koncie.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Opuść', style: 'destructive', onPress: async () => {
        await supabase.rpc('opusc_household')
        const { data } = await supabase.from('household_members').select('household_id')
          .eq('user_id', user.id).limit(1).single()
        if (data) setHouseholdId(data.household_id)
        await pobierz()
      }},
    ])
  }

  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
      >
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </Pressable>
          <Text style={s.tytul}>Rodzina</Text>
          <View style={{ width: 24 }} />
        </View>

        {mojeZaproszenia.length > 0 && (
          <View style={s.sekcja}>
            <Text style={s.sekcjaTytul}>Zaproszenia do Ciebie</Text>
            {mojeZaproszenia.map(z => (
              <View key={z.id} style={s.zaprRow}>
                <Text style={s.zaprTxt}>Od: {z.invited_by_email}</Text>
                <View style={s.zaprBtns}>
                  <Pressable style={s.zaprBtnOk} onPress={() => akceptujZaproszenie(z.id)}>
                    <Text style={s.zaprBtnTxt}>Dołącz</Text>
                  </Pressable>
                  <Pressable style={s.zaprBtnNo} onPress={() => odrzucZaproszenie(z.id)}>
                    <Text style={[s.zaprBtnTxt, { color: t.mute }]}>Odrzuć</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={s.sekcja}>
          <Text style={s.sekcjaTytul}>Członkowie ({czlonkowie.length}/5)</Text>
          {czlonkowie.map(c => {
            const nazwa = c.full_name || c.email || '?'
            const inicjal = nazwa.charAt(0).toUpperCase()
            const czyJa = c.user_id === user?.id
            return (
              <View key={c.user_id} style={s.czlRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{inicjal}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.czlNazwa}>{nazwa}{czyJa ? ' (Ty)' : ''}</Text>
                  {c.email && c.full_name && <Text style={s.czlEmail}>{c.email}</Text>}
                </View>
                {!czyJa && (
                  <Pressable onPress={() => usunCzlonka(c.user_id, nazwa)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={t.mute} />
                  </Pressable>
                )}
              </View>
            )
          })}
        </View>

        <View style={s.sekcja}>
          <Text style={s.sekcjaTytul}>Zaproś osobę</Text>
          <View style={s.zaprosRow}>
            <TextInput
              style={s.zaprosInput}
              value={email}
              onChangeText={setEmail}
              placeholder="email@przykład.pl"
              placeholderTextColor={t.mute}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable style={[s.zaprosBtn, sending && { opacity: 0.5 }]} onPress={zapros} disabled={sending}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>

          {zaproszenia.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.subLabel}>Oczekujące</Text>
              {zaproszenia.map(z => (
                <View key={z.id} style={s.pendingRow}>
                  <Text style={s.pendingEmail}>{z.invited_email}</Text>
                  <Pressable onPress={() => anulujZaproszenie(z.id)} hitSlop={8}>
                    <Text style={s.pendingCancel}>Anuluj</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {czlonkowie.length > 1 && (
          <Pressable style={s.opuscBtn} onPress={opusc}>
            <Ionicons name="exit-outline" size={18} color={t.danger} />
            <Text style={s.opuscTxt}>Opuść rodzinę</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, paddingBottom: 40 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20,
    },
    tytul: { fontFamily: fonts.serif, fontSize: 22, color: t.text },
    sekcja: { marginBottom: 24 },
    sekcjaTytul: {
      fontFamily: fonts.sans, fontSize: 11, fontWeight: '700', color: t.mute,
      letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
    },
    czlRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
    },
    avatar: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: t.accentSoft, justifyContent: 'center', alignItems: 'center',
    },
    avatarTxt: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '700', color: t.accent },
    czlNazwa: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '600', color: t.text },
    czlEmail: { fontFamily: fonts.sans, fontSize: 12, color: t.mute },
    zaprosRow: { flexDirection: 'row', gap: 8 },
    zaprosInput: {
      flex: 1, backgroundColor: t.surface, borderRadius: 10, padding: 12,
      fontFamily: fonts.sans, fontSize: 14, color: t.text,
      borderWidth: 1, borderColor: t.border,
    },
    zaprosBtn: {
      width: 44, height: 44, borderRadius: 10,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center',
    },
    subLabel: {
      fontFamily: fonts.sans, fontSize: 10, fontWeight: '700', color: t.mute,
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
    },
    pendingRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 8,
    },
    pendingEmail: { fontFamily: fonts.sans, fontSize: 14, color: t.text },
    pendingCancel: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', color: t.accent },
    zaprRow: {
      backgroundColor: t.surface, borderRadius: 14, padding: 14, marginBottom: 8,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    zaprTxt: { fontFamily: fonts.sans, fontSize: 14, color: t.text, marginBottom: 8 },
    zaprBtns: { flexDirection: 'row', gap: 8 },
    zaprBtnOk: {
      backgroundColor: t.accent, borderRadius: 8,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    zaprBtnNo: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    zaprBtnTxt: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', color: '#fff' },
    opuscBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 14,
      backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border,
    },
    opuscTxt: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '600', color: t.danger },
  })
}
