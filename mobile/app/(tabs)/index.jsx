import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion } from '../../shared/theme'
import { formatDataLocal as formatData } from '../../shared/dataHelpers'
import { useSloty, slotyWDniu, kluczDnia, sanityzuj } from '../../shared/useSloty'
import { useAuth } from '../../hooks/useAuth'

function getPowitanie() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11)  return 'Dzień dobry'
  if (h >= 11 && h < 17) return 'Cześć'
  if (h >= 17 && h < 22) return 'Dobry wieczór'
  return 'Dobranoc'
}

function dataPlus(d, dni) {
  const n = new Date(d); n.setDate(n.getDate() + dni); return n
}

function getEmoji(nazwa) {
  const n = (nazwa || '').toLowerCase()
  if (n.includes('kurczak') || n.includes('pierś')) return '🍗'
  if (n.includes('wołow') || n.includes('stek') || n.includes('burger')) return '🥩'
  if (n.includes('ryb') || n.includes('dorsz') || n.includes('pstrąg')) return '🐟'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('makaron') || n.includes('spaghetti')) return '🍝'
  if (n.includes('zupa') || n.includes('gulasz')) return '🍲'
  if (n.includes('sałat')) return '🥗'
  if (n.includes('pierogi') || n.includes('kopytka')) return '🥟'
  if (n.includes('jajk')) return '🍳'
  return '🍽️'
}

function getKolor(nazwa) {
  const kolory = ['#F4E2D8','#E7E9D5','#EFE0DA','#E4E2D4','#F0DDC9','#E0E3D6','#F4D9CC','#DCE5D2']
  let hash = 0
  for (let i = 0; i < (nazwa || '').length; i++) hash = nazwa.charCodeAt(i) + ((hash << 5) - hash)
  return kolory[Math.abs(hash) % kolory.length]
}

export default function HomeScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const imie = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cześć'
  const [powitanie] = useState(getPowitanie)
  const [planDzis, setPlanDzis] = useState([])
  const [planJutro, setPlanJutro] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Pobieranie householdId
  const [householdId, setHouseholdId] = useState(null)
  useEffect(() => {
    if (!user) return
    supabase.from('household_members').select('household_id')
      .eq('user_id', user.id).limit(1).single()
      .then(({ data }) => { if (data) setHouseholdId(data.household_id) })
  }, [user])

  const { config: slotyConfig } = useSloty(householdId)

  const pobierzPlan = useCallback(async () => {
    if (!householdId) return
    const dzis = new Date()
    const jutro = dataPlus(dzis, 1)
    const daty = [formatData(dzis), formatData(jutro)]

    const { data } = await supabase.from('kalendarz').select('*')
      .eq('household_id', householdId)
      .in('data', daty)

    if (!data) return

    const dzisData = formatData(dzis)
    const jutroData = formatData(jutro)
    setPlanDzis(data.filter(p => p.data === dzisData && p.danie))
    setPlanJutro(data.filter(p => p.data === jutroData && p.danie))
    setLoading(false)
  }, [householdId])

  useEffect(() => { pobierzPlan() }, [pobierzPlan])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await pobierzPlan()
    setRefreshing(false)
  }, [pobierzPlan])

  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
      >
        <View style={s.header}>
          <Text style={s.greeting}>{powitanie},</Text>
          <Text style={s.name}>{imie}!</Text>
        </View>

        <PlanSekcja tytul="Dzisiaj" wpisy={planDzis} puste="Nic nie zaplanowano" />
        <PlanSekcja tytul="Jutro" wpisy={planJutro} puste="Nic nie zaplanowano" />

        <Pressable style={s.ctaBtn} onPress={() => router.push('/(tabs)/planer')}>
          <Text style={s.ctaTxt}>📅  Otwórz planer</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function PlanSekcja({ tytul, wpisy, puste }) {
  const s = makeS()
  return (
    <View style={s.sekcja}>
      <Text style={s.sekcjaTytul}>{tytul}</Text>
      {wpisy.length === 0 ? (
        <Text style={s.pusteLabel}>{puste}</Text>
      ) : (
        wpisy.map(w => (
          <View key={w.id} style={s.posilekRow}>
            <View style={[s.posilekThumb, { backgroundColor: getKolor(w.danie) }]}>
              <Text style={s.posilekEmoji}>{getEmoji(w.danie)}</Text>
            </View>
            <View style={s.posilekInfo}>
              <Text style={s.posilekSlot}>{(w.posilek || '').toUpperCase()}</Text>
              <Text style={s.posilekNazwa} numberOfLines={2}>{w.danie}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    header: { marginBottom: 28 },
    greeting: { fontFamily: fonts.sans, fontSize: 16, color: t.mute, fontWeight: '500' },
    name: { fontFamily: fonts.serif, fontSize: 36, color: t.text, marginTop: 2 },
    sekcja: { marginBottom: 24 },
    sekcjaTytul: {
      fontFamily: fonts.serif, fontSize: 22, color: t.text,
      marginBottom: 12,
    },
    pusteLabel: { fontFamily: fonts.sans, fontSize: 14, color: t.mute, fontStyle: 'italic' },
    posilekRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: t.surface, borderRadius: 14, padding: 10,
      marginBottom: 8,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    posilekThumb: {
      width: 52, height: 52, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
    },
    posilekEmoji: { fontSize: 24 },
    posilekInfo: { flex: 1, gap: 3 },
    posilekSlot: {
      fontFamily: fonts.sans, fontSize: 9, fontWeight: '700',
      letterSpacing: 1.2, color: t.accent,
    },
    posilekNazwa: {
      fontFamily: fonts.sans, fontSize: 15, fontWeight: '600', color: t.text,
      lineHeight: 20,
    },
    ctaBtn: {
      backgroundColor: t.accent, borderRadius: 14, padding: 16,
      alignItems: 'center', marginTop: 8,
    },
    ctaTxt: {
      fontFamily: fonts.sans, fontSize: 16, fontWeight: '600', color: '#fff',
    },
  })
}
