import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, SectionList, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion } from '../../shared/theme'
import { formatDataLocal as formatData } from '../../shared/dataHelpers'
import { useAuth } from '../../hooks/useAuth'

const KUPIONE_KEY = 'zakupy_kupione'

function poniedzialekTygodnia() {
  const d = new Date()
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ZakupyScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState(null)
  const [items, setItems] = useState([])
  const [kupione, setKupione] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(KUPIONE_KEY).then(json => {
      if (json) setKupione(new Set(JSON.parse(json)))
    })
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('household_members').select('household_id')
      .eq('user_id', user.id).limit(1).single()
      .then(({ data }) => { if (data) setHouseholdId(data.household_id) })
  }, [user])

  const generuj = useCallback(async () => {
    if (!householdId) return
    const pon = poniedzialekTygodnia()
    const nd = new Date(pon); nd.setDate(nd.getDate() + 6)
    const dzis = formatData(new Date())

    const { data: planData } = await supabase.from('kalendarz').select('*')
      .eq('household_id', householdId)
      .gte('data', dzis)
      .lte('data', formatData(nd))

    const nazwyDan = [...new Set((planData || []).filter(p => p.danie).map(p => p.danie))]
    if (!nazwyDan.length) { setItems([]); setLoading(false); return }

    const { data: wiersze } = await supabase.from('dania')
      .select('"Danie", "Składnik", "Ilość", "Jednostka", "Kategoria"')
      .in('Danie', nazwyDan)

    const mapa = new Map()
    for (const w of wiersze || []) {
      if (!w.Składnik) continue
      const klucz = w.Składnik.toLowerCase()
      const istn = mapa.get(klucz)
      if (istn) {
        istn.ilosc += (w.Ilość || 0)
      } else {
        mapa.set(klucz, {
          skladnik: w.Składnik,
          ilosc: w.Ilość || 0,
          jednostka: w.Jednostka || '',
          kategoria: w.Kategoria || 'Inne',
        })
      }
    }

    setItems([...mapa.values()].sort((a, b) => a.skladnik.localeCompare(b.skladnik, 'pl')))
    setLoading(false)
  }, [householdId])

  useEffect(() => { generuj() }, [generuj])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await generuj()
    setRefreshing(false)
  }, [generuj])

  const toggle = (klucz) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setKupione(prev => {
      const nowy = new Set(prev)
      if (nowy.has(klucz)) nowy.delete(klucz)
      else nowy.add(klucz)
      AsyncStorage.setItem(KUPIONE_KEY, JSON.stringify([...nowy]))
      return nowy
    })
  }

  const sections = useMemo(() => {
    const groups = {}
    for (const it of items) {
      const kat = it.kategoria
      if (!groups[kat]) groups[kat] = []
      groups[kat].push(it)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b, 'pl'))
      .map(([title, data]) => ({ title, data }))
  }, [items])

  const doKupienia = items.filter(it => !kupione.has(it.skladnik.toLowerCase())).length
  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.tytul}>Lista zakupów</Text>
          {kupione.size > 0 && (
            <Pressable onPress={() => { setKupione(new Set()); AsyncStorage.removeItem(KUPIONE_KEY) }}>
              <Text style={s.resetTxt}>Wyczyść ✓</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.sub}>{doKupienia} {doKupienia === 1 ? 'pozycja' : 'pozycji'} do kupienia</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={item => item.skladnik}
        renderSectionHeader={({ section }) => (
          <Text style={s.sekcja}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const klucz = item.skladnik.toLowerCase()
          const done = kupione.has(klucz)
          return (
            <Pressable style={[s.row, done && s.rowDone]} onPress={() => toggle(klucz)}>
              <View style={[s.check, done && s.checkDone]}>
                {done && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={[s.rowTxt, done && s.rowTxtDone]} numberOfLines={1}>
                {item.skladnik}
              </Text>
              <Text style={[s.rowIlosc, done && s.rowTxtDone]}>
                {item.ilosc > 0 ? `${item.ilosc} ${item.jednostka}` : ''}
              </Text>
            </Pressable>
          )
        }}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
        ListEmptyComponent={<Text style={s.empty}>Zaplanuj posiłki, żeby wygenerować listę</Text>}
      />
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    tytul: { fontFamily: fonts.serif, fontSize: 30, color: t.text },
    resetTxt: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', color: t.accent },
    sub: { fontFamily: fonts.sans, fontSize: 13, color: t.mute, marginTop: 4 },
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    sekcja: {
      fontFamily: fonts.sans, fontSize: 11, fontWeight: '700', color: t.accent,
      letterSpacing: 1.2, textTransform: 'uppercase',
      paddingVertical: 10, paddingTop: 18, backgroundColor: t.bg,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 12, paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
    },
    rowDone: { opacity: 0.45 },
    check: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, borderColor: t.border,
      justifyContent: 'center', alignItems: 'center',
    },
    checkDone: { backgroundColor: t.secondary, borderColor: t.secondary },
    checkMark: { fontSize: 12, color: '#fff', fontWeight: '700' },
    rowTxt: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: t.text },
    rowTxtDone: { textDecorationLine: 'line-through', color: t.mute },
    rowIlosc: { fontFamily: fonts.sans, fontSize: 13, color: t.mute },
    empty: { fontFamily: fonts.sans, fontSize: 14, color: t.mute, textAlign: 'center', marginTop: 60 },
  })
}
