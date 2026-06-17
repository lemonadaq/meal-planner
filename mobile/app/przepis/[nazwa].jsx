import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet, Alert, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion } from '../../shared/theme'

function getEmoji(nazwa) {
  const n = (nazwa || '').toLowerCase()
  if (n.includes('kurczak') || n.includes('pierś')) return '🍗'
  if (n.includes('wołow') || n.includes('stek')) return '🥩'
  if (n.includes('ryb') || n.includes('dorsz')) return '🐟'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('makaron')) return '🍝'
  if (n.includes('zupa')) return '🍲'
  if (n.includes('sałat')) return '🥗'
  if (n.includes('pierogi')) return '🥟'
  return '🍽️'
}

function getKolor(nazwa) {
  const kolory = ['#F4E2D8','#E7E9D5','#EFE0DA','#E4E2D4','#F0DDC9','#E0E3D6']
  let hash = 0
  for (let i = 0; i < (nazwa || '').length; i++) hash = nazwa.charCodeAt(i) + ((hash << 5) - hash)
  return kolory[Math.abs(hash) % kolory.length]
}

export default function PrzepisDetailScreen() {
  const _v = useThemeVersion()
  const { nazwa } = useLocalSearchParams()
  const [danie, setDanie] = useState(null)
  const [skladniki, setSkladniki] = useState([])
  const [ulubione, setUlubione] = useState(false)
  const [przepis, setPrzepis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!nazwa) return
    supabase.from('dania')
      .select('"Danie", rodzaj, "TYP", zdjecie, ulubione, czas_minuty, "Składnik", "Ilość", "Jednostka", "Kategoria", "Przepis"')
      .eq('Danie', nazwa)
      .then(({ data }) => {
        if (!data?.length) { setLoading(false); return }
        setDanie(data[0])
        setUlubione(!!data[0].ulubione)
        const p = data.find(w => w.Przepis)?.Przepis
        if (p) setPrzepis(p)
        setSkladniki(data.filter(w => w.Składnik).map(w => ({
          nazwa: w.Składnik,
          ilosc: w.Ilość,
          jednostka: w.Jednostka || '',
          kategoria: w.Kategoria || 'Inne',
        })))
        setLoading(false)
      })
  }, [nazwa])

  const toggleUlubione = useCallback(async () => {
    const nowy = !ulubione
    setUlubione(nowy)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await supabase.from('dania').update({ ulubione: nowy }).eq('Danie', nazwa)
  }, [ulubione, nazwa])

  const udostepnij = useCallback(async () => {
    const txt = [`🍽️ ${nazwa}`, '']
    if (skladniki.length) {
      txt.push('Składniki:')
      skladniki.forEach(sk => {
        const il = sk.ilosc > 0 ? `${sk.ilosc} ${sk.jednostka}` : ''
        txt.push(`• ${sk.nazwa}${il ? ' — ' + il : ''}`)
      })
    }
    if (przepis) {
      txt.push('', 'Przygotowanie:', przepis)
    }
    await Share.share({ message: txt.join('\n') })
  }, [nazwa, skladniki, przepis])

  const usunDanie = useCallback(() => {
    Alert.alert('Usuń danie', `Czy na pewno chcesz usunąć "${nazwa}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń', style: 'destructive', onPress: async () => {
          await supabase.from('dania').delete().eq('Danie', nazwa)
          router.back()
        }
      },
    ])
  }, [nazwa])

  const s = makeS()

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.loading}>Ładowanie...</Text>
      </SafeAreaView>
    )
  }

  if (!danie) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.loading}>Nie znaleziono przepisu</Text>
      </SafeAreaView>
    )
  }

  const kroki = przepis?.split(/\n+/).filter(Boolean) || []

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </Pressable>
          <View style={s.headerActions}>
            <Pressable onPress={toggleUlubione} hitSlop={8}>
              <Ionicons name={ulubione ? 'heart' : 'heart-outline'} size={22} color={ulubione ? t.danger : t.mute} />
            </Pressable>
            <Pressable onPress={udostepnij} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color={t.mute} />
            </Pressable>
            <Pressable onPress={usunDanie} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color={t.mute} />
            </Pressable>
          </View>
        </View>

        {danie.zdjecie ? (
          <Image source={{ uri: danie.zdjecie }} style={s.hero} />
        ) : (
          <View style={[s.hero, { backgroundColor: getKolor(nazwa), justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 64 }}>{getEmoji(nazwa)}</Text>
          </View>
        )}

        <View style={s.info}>
          <Text style={s.nazwa}>{nazwa}</Text>
          <View style={s.chipRow}>
            {danie.rodzaj && (
              <View style={s.chip}>
                <Text style={s.chipTxt}>{danie.rodzaj}</Text>
              </View>
            )}
            {danie.TYP && (
              <View style={s.chip}>
                <Text style={s.chipTxt}>{danie.TYP === 'z_dodatkiem' ? 'z dodatkiem' : 'samodzielne'}</Text>
              </View>
            )}
            {danie.czas_minuty > 0 && (
              <View style={s.chip}>
                <Ionicons name="time-outline" size={12} color={t.mute} />
                <Text style={s.chipTxt}>{danie.czas_minuty} min</Text>
              </View>
            )}
          </View>
        </View>

        {skladniki.length > 0 && (
          <View style={s.sekcja}>
            <Text style={s.sekcjaTytul}>Składniki</Text>
            {skladniki.map((sk, i) => (
              <View key={i} style={s.skladnikRow}>
                <View style={s.dot} />
                <Text style={s.skladnikNazwa}>{sk.nazwa}</Text>
                <Text style={s.skladnikIlosc}>
                  {sk.ilosc > 0 ? `${sk.ilosc} ${sk.jednostka}` : sk.jednostka || ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {kroki.length > 0 && (
          <View style={s.sekcja}>
            <Text style={s.sekcjaTytul}>Przygotowanie</Text>
            {kroki.map((krok, i) => (
              <View key={i} style={s.krokRow}>
                <View style={s.krokNum}>
                  <Text style={s.krokNumTxt}>{i + 1}</Text>
                </View>
                <Text style={s.krokTxt}>{krok.replace(/^\d+[\.\)]\s*/, '')}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { paddingBottom: 40 },
    loading: { fontFamily: fonts.sans, fontSize: 14, color: t.mute, textAlign: 'center', marginTop: 60 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerActions: { flexDirection: 'row', gap: 16 },
    hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: t.surfaceAlt },
    info: { padding: 20, gap: 10 },
    nazwa: { fontFamily: fonts.serif, fontSize: 28, color: t.text },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 5,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    chipTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.mute },
    sekcja: { paddingHorizontal: 20, paddingTop: 8, marginBottom: 16 },
    sekcjaTytul: {
      fontFamily: fonts.serif, fontSize: 20, color: t.text, marginBottom: 12,
    },
    skladnikRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
    },
    dot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent,
    },
    skladnikNazwa: { fontFamily: fonts.sans, fontSize: 15, color: t.text, flex: 1 },
    skladnikIlosc: { fontFamily: fonts.sans, fontSize: 14, color: t.mute },
    krokRow: {
      flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start',
    },
    krokNum: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: t.accentSoft, justifyContent: 'center', alignItems: 'center',
    },
    krokNumTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '700', color: t.accent },
    krokTxt: { fontFamily: fonts.sans, fontSize: 15, color: t.text, flex: 1, lineHeight: 22 },
  })
}
