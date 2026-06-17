import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, FlatList, Image, TextInput, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion } from '../../shared/theme'
import { useAuth } from '../../hooks/useAuth'

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

const RODZAJE = ['śniadanie', 'obiad', 'kolacja', 'zupa', 'deser']

export default function PrzepisyScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const [dania, setDania] = useState([])
  const [filtr, setFiltr] = useState('')
  const [aktywneRodzaje, setAktywneRodzaje] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('dania').select('"Danie", rodzaj, "TYP", zdjecie, ulubione')
      .then(({ data }) => {
        const mapa = new Map()
        for (const w of data || []) {
          if (w.Danie && !mapa.has(w.Danie)) mapa.set(w.Danie, w)
        }
        setDania([...mapa.values()].sort((a, b) => a.Danie.localeCompare(b.Danie, 'pl')))
        setLoading(false)
      })
  }, [])

  const toggleRodzaj = (r) => {
    setAktywneRodzaje(prev => {
      const nowy = new Set(prev)
      if (nowy.has(r)) nowy.delete(r)
      else nowy.add(r)
      return nowy
    })
  }

  const filtrowane = useMemo(() => {
    let wynik = dania
    if (filtr) wynik = wynik.filter(d => d.Danie.toLowerCase().includes(filtr.toLowerCase()))
    if (aktywneRodzaje.size > 0) wynik = wynik.filter(d => aktywneRodzaje.has(d.rodzaj))
    return wynik
  }, [dania, filtr, aktywneRodzaje])

  const s = makeS()

  const renderItem = ({ item }) => (
    <Pressable style={s.card} onPress={() => router.push(`/przepis/${encodeURIComponent(item.Danie)}`)}>
      <View style={[s.thumb, { backgroundColor: getKolor(item.Danie) }]}>
        {item.zdjecie ? (
          <Image source={{ uri: item.zdjecie }} style={s.thumbImg} />
        ) : (
          <Text style={s.thumbEmoji}>{getEmoji(item.Danie)}</Text>
        )}
      </View>
      <Text style={s.cardNazwa} numberOfLines={2}>{item.Danie}</Text>
      <Text style={s.cardRodzaj}>{item.rodzaj}</Text>
    </Pressable>
  )

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.tytul}>Przepisy</Text>
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Szukaj przepisu..."
          placeholderTextColor={t.mute}
          value={filtr}
          onChangeText={setFiltr}
        />
        {filtr.length > 0 && (
          <Pressable style={s.clearBtn} onPress={() => setFiltr('')}>
            <Text style={s.clearTxt}>✕</Text>
          </Pressable>
        )}
      </View>
      <View style={s.chipRow}>
        {RODZAJE.map(r => {
          const aktywny = aktywneRodzaje.has(r)
          return (
            <Pressable key={r} style={[s.chipF, aktywny && s.chipFAktywny]} onPress={() => toggleRodzaj(r)}>
              <Text style={[s.chipFTxt, aktywny && s.chipFTxtAktywny]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <FlatList
        data={filtrowane}
        keyExtractor={item => item.Danie}
        numColumns={2}
        columnWrapperStyle={s.gridRow}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
      />
      <Pressable style={s.fab} onPress={() => router.push('/dodaj')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    tytul: {
      fontFamily: fonts.serif, fontSize: 30, color: t.text,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    },
    searchWrap: {
      marginHorizontal: 16, marginBottom: 12, position: 'relative',
    },
    searchInput: {
      backgroundColor: t.surface, borderRadius: 12, padding: 12,
      fontFamily: fonts.sans, fontSize: 15, color: t.text,
      borderWidth: 1, borderColor: t.border,
    },
    clearBtn: {
      position: 'absolute', right: 12, top: 12,
    },
    clearTxt: { fontSize: 16, color: t.mute },
    chipRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 6,
      paddingHorizontal: 16, marginBottom: 12,
    },
    chipF: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    chipFAktywny: { backgroundColor: t.accent },
    chipFTxt: {
      fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.mute,
    },
    chipFTxtAktywny: { color: '#fff' },
    listContent: { paddingHorizontal: 12, paddingBottom: 40 },
    gridRow: { gap: 8, marginBottom: 8 },
    card: {
      flex: 1, backgroundColor: t.surface, borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    thumb: {
      aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
    },
    thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    thumbEmoji: { fontSize: 40 },
    cardNazwa: {
      fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', color: t.text,
      padding: 8, paddingBottom: 2,
    },
    cardRodzaj: {
      fontFamily: fonts.sans, fontSize: 10, fontWeight: '600', color: t.mute,
      paddingHorizontal: 8, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8,
    },
    fab: {
      position: 'absolute', right: 20, bottom: 20,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  })
}
