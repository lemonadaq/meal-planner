import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { View, Text, ScrollView, FlatList, Image, Pressable, StyleSheet, RefreshControl, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion } from '../../shared/theme'
import { formatDataLocal as formatData } from '../../shared/dataHelpers'
import { useSloty, slotyWDniu, kluczDnia, sanityzuj } from '../../shared/useSloty'
import { useGenerator } from '../../shared/useGenerator'
import { useAuth } from '../../hooks/useAuth'

const DNI = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

function poniedzialekTygodnia(offset = 0) {
  const d = new Date()
  const dow = d.getDay()
  const diff = (dow === 0 ? -6 : 1 - dow) + offset * 7
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function dniTygodnia(pon) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(pon)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getEmoji(nazwa) {
  const n = (nazwa || '').toLowerCase()
  if (n.includes('kurczak') || n.includes('pierś')) return '🍗'
  if (n.includes('wołow') || n.includes('stek')) return '🥩'
  if (n.includes('ryb') || n.includes('dorsz')) return '🐟'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('makaron') || n.includes('spaghetti')) return '🍝'
  if (n.includes('zupa') || n.includes('gulasz')) return '🍲'
  if (n.includes('sałat')) return '🥗'
  if (n.includes('pierogi')) return '🥟'
  if (n.includes('jajk')) return '🍳'
  return '🍽️'
}

function getKolor(nazwa) {
  const kolory = ['#F4E2D8','#E7E9D5','#EFE0DA','#E4E2D4','#F0DDC9','#E0E3D6']
  let hash = 0
  for (let i = 0; i < (nazwa || '').length; i++) hash = nazwa.charCodeAt(i) + ((hash << 5) - hash)
  return kolory[Math.abs(hash) % kolory.length]
}

function isDzis(d) {
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

export default function PlanerScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState(null)
  const [tydzien, setTydzien] = useState(0)
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('household_members').select('household_id')
      .eq('user_id', user.id).limit(1).single()
      .then(({ data }) => { if (data) setHouseholdId(data.household_id) })
  }, [user])

  const { config: slotyConfig } = useSloty(householdId)
  const cfg = sanityzuj(slotyConfig)
  const { generuj, wymienDanie } = useGenerator({ user, householdId, slotyConfig })
  const [generowanie, setGenerowanie] = useState(false)

  const pon = useMemo(() => poniedzialekTygodnia(tydzien), [tydzien])
  const dni = useMemo(() => dniTygodnia(pon), [pon])

  const slotyDlaDnia = useCallback((dzien) => {
    const d = typeof dzien === 'string' ? dzien : dzien
    const kd = kluczDnia(d)
    return cfg.dni?.[kd] || []
  }, [cfg])

  const nazwaSlotu = useCallback((id) => {
    const slot = (cfg.sloty || []).find(s => s.id === id)
    return slot?.nazwa || id
  }, [cfg])

  const pobierzPlan = useCallback(async () => {
    if (!householdId) return
    const ponStr = formatData(pon)
    const ndStr = formatData(dni[6])
    const { data } = await supabase.from('kalendarz').select('*')
      .eq('household_id', householdId)
      .gte('data', ponStr).lte('data', ndStr)

    const nowyPlan = {}
    ;(data || []).forEach(p => { nowyPlan[`${p.data}_${p.posilek}`] = p })
    setPlan(nowyPlan)
    setLoading(false)
  }, [householdId, pon, dni])

  useEffect(() => { pobierzPlan() }, [pobierzPlan])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await pobierzPlan()
    setRefreshing(false)
  }, [pobierzPlan])

  const usunPosilek = useCallback(async (dataStr, posilek) => {
    const klucz = `${dataStr}_${posilek}`
    const wpis = plan[klucz]
    if (!wpis) return
    await supabase.from('kalendarz').delete().eq('id', wpis.id)
    setPlan(p => { const n = { ...p }; delete n[klucz]; return n })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [plan])

  const generujPlan = useCallback(async (tryb = 'puste') => {
    if (!householdId || generowanie) return
    setGenerowanie(true)
    try {
      const wynik = await generuj({ dniTygodnia: dni, istniejacyPlan: plan, tryb })
      if (wynik?.error) {
        Alert.alert('Błąd', 'Nie udało się ułożyć planu')
      } else {
        await pobierzPlan()
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert('Gotowe', `Ułożono ${wynik?.ileDodano || 0} posiłków`)
      }
    } catch (e) {
      Alert.alert('Błąd', e.message)
    }
    setGenerowanie(false)
  }, [householdId, generowanie, generuj, dni, plan, pobierzPlan])

  const wymienPosilek = useCallback(async (wpis) => {
    if (!wpis?.id) return
    const { nowaNazwa, error } = await wymienDanie({
      dataStr: wpis.data,
      slotId: wpis.posilek,
      nazwaSlotu: nazwaSlotu(wpis.posilek),
      wpisId: wpis.id,
      unikaj: [wpis.danie],
    })
    if (error || !nowaNazwa) {
      Alert.alert('Brak alternatyw', 'Nie znaleziono innego dania tego rodzaju')
      return
    }
    const klucz = `${wpis.data}_${wpis.posilek}`
    setPlan(p => ({ ...p, [klucz]: { ...wpis, danie: nowaNazwa, dodatki: [], podmiany: {} } }))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [wymienDanie, nazwaSlotu])

  const formatMiesiac = (d) => {
    const mies = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
    return `${mies[d.getMonth()]} ${d.getFullYear()}`
  }

  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.miesiac}>{formatMiesiac(dni[3]).toUpperCase()}</Text>
          <Text style={s.tytul}>Twój tydzień</Text>
        </View>
        <View style={s.navRow}>
          <Pressable style={s.navBtn} onPress={() => setTydzien(t => t - 1)}>
            <Text style={s.navTxt}>‹</Text>
          </Pressable>
          <Pressable style={s.navBtn} onPress={() => setTydzien(t => t + 1)}>
            <Text style={s.navTxt}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.dayStrip}>
        {dni.map((dzien, i) => {
          const today = isDzis(dzien)
          return (
            <View key={i} style={[s.dayPill, today && s.dayPillToday]}>
              <Text style={[s.dayDow, today && s.dayDowToday]}>{DNI[i]}</Text>
              <Text style={[s.dayNum, today && s.dayNumToday]}>{dzien.getDate()}</Text>
            </View>
          )
        })}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
      >
        <Pressable
          style={[s.genBtn, generowanie && s.genBtnDisabled]}
          onPress={() => {
            const maZawartosc = Object.values(plan).some(p => p.danie)
            if (maZawartosc) {
              Alert.alert('Ułóż plan', 'Co zrobić z istniejącymi posiłkami?', [
                { text: 'Anuluj', style: 'cancel' },
                { text: 'Uzupełnij puste', onPress: () => generujPlan('puste') },
                { text: 'Ułóż od nowa', style: 'destructive', onPress: () => generujPlan('wszystko') },
              ])
            } else {
              generujPlan('wszystko')
            }
          }}
          disabled={generowanie}
        >
          <Text style={s.genTxt}>{generowanie ? 'Generuję...' : '✨  Ułóż plan na tydzień'}</Text>
        </Pressable>
        {dni.map((dzien, di) => {
          const dataStr = formatData(dzien)
          const today = isDzis(dzien)
          const slotyDnia = slotyDlaDnia(dzien)
          return (
            <View key={dataStr} style={s.dzienBlok}>
              <View style={s.dzienHeader}>
                <Text style={s.dzienTytul}>{DNI[di]} {dzien.getDate()}</Text>
                {today && <View style={s.dzisChip}><Text style={s.dzisChipTxt}>DZIŚ</Text></View>}
              </View>
              {slotyDnia.map(posilek => {
                const klucz = `${dataStr}_${posilek}`
                const wpis = plan[klucz]
                return (
                  <PosilekRow
                    key={posilek}
                    wpis={wpis}
                    slotLabel={nazwaSlotu(posilek)}
                    onWymien={wpis?.danie ? () => wymienPosilek(wpis) : null}
                    onUsun={() => {
                      Alert.alert('Usuń', `Usunąć ${wpis?.danie}?`, [
                        { text: 'Anuluj', style: 'cancel' },
                        { text: 'Usuń', style: 'destructive', onPress: () => usunPosilek(dataStr, posilek) },
                      ])
                    }}
                  />
                )
              })}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

function PosilekRow({ wpis, slotLabel, onWymien, onUsun }) {
  const s = makeS()
  const masDanie = !!wpis?.danie

  if (!masDanie) {
    return (
      <Pressable style={s.rowPuste}>
        <Text style={s.rowPusteSlot}>{slotLabel}</Text>
        <Text style={s.rowPustePlus}>+</Text>
      </Pressable>
    )
  }

  return (
    <View style={s.row}>
      <View style={[s.rowThumb, { backgroundColor: getKolor(wpis.danie) }]}>
        <Text style={s.rowEmoji}>{getEmoji(wpis.danie)}</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={[s.rowSlot, { color: t.accent }]}>{slotLabel.toUpperCase()}</Text>
        <Text style={s.rowNazwa} numberOfLines={2}>{wpis.danie}</Text>
      </View>
      {onWymien && (
        <Pressable style={s.rowBtn} onPress={onWymien} hitSlop={8}>
          <Text style={s.rowBtnTxt}>🔄</Text>
        </Pressable>
      )}
      <Pressable style={s.rowBtn} onPress={onUsun} hitSlop={8}>
        <Text style={s.rowBtnTxt}>✕</Text>
      </Pressable>
    </View>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    headerRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    },
    miesiac: {
      fontFamily: fonts.sans, fontSize: 10, fontWeight: '700',
      letterSpacing: 1.5, color: t.accent,
    },
    tytul: { fontFamily: fonts.serif, fontSize: 30, color: t.text },
    navRow: { flexDirection: 'row', gap: 8 },
    navBtn: {
      width: 36, height: 36, borderRadius: 999,
      borderWidth: 1, borderColor: t.border, backgroundColor: t.surface,
      justifyContent: 'center', alignItems: 'center',
    },
    navTxt: { fontFamily: fonts.serif, fontSize: 20, color: t.text },
    dayStrip: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 10,
    },
    dayPill: {
      alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6,
      borderRadius: 12,
    },
    dayPillToday: { backgroundColor: t.accent },
    dayDow: { fontFamily: fonts.sans, fontSize: 10, fontWeight: '700', color: t.mute },
    dayDowToday: { color: '#fff' },
    dayNum: { fontFamily: fonts.serif, fontSize: 18, color: t.text, marginTop: 2 },
    dayNumToday: { color: '#fff' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    genBtn: {
      backgroundColor: t.accent, borderRadius: 14, padding: 16,
      alignItems: 'center', marginBottom: 16,
    },
    genBtnDisabled: { opacity: 0.5 },
    genTxt: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '600', color: '#fff' },
    dzienBlok: { marginBottom: 16 },
    dzienHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 8,
    },
    dzienTytul: { fontFamily: fonts.serif, fontSize: 17, color: t.text },
    dzisChip: {
      backgroundColor: t.accent, borderRadius: 6,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    dzisChipTxt: { fontFamily: fonts.sans, fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 1 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: t.surface, borderRadius: 14, padding: 8,
      marginBottom: 6,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    rowThumb: {
      width: 52, height: 52, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
    },
    rowEmoji: { fontSize: 22 },
    rowInfo: { flex: 1, gap: 2 },
    rowSlot: {
      fontFamily: fonts.sans, fontSize: 8, fontWeight: '700', letterSpacing: 1.2,
    },
    rowNazwa: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '600', color: t.text, lineHeight: 19 },
    rowBtn: {
      width: 28, height: 28, borderRadius: 999,
      backgroundColor: t.surfaceAlt, justifyContent: 'center', alignItems: 'center',
    },
    rowBtnTxt: { fontSize: 12, color: t.mute, fontWeight: '700' },
    rowPuste: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.surfaceAlt, borderRadius: 14, padding: 14,
      marginBottom: 6, borderWidth: 1, borderColor: t.border, borderStyle: 'dashed',
    },
    rowPusteSlot: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.mute },
    rowPustePlus: { fontSize: 20, color: t.mute },
  })
}
