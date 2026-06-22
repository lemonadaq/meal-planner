import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Image, TextInput, Pressable, StyleSheet, Alert, Share, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../shared/supabase'
import { t, fonts, useThemeVersion } from '../../shared/theme'

const RODZAJE = ['obiad', 'śniadanie', 'kolacja', 'zupa', 'deser', 'przekąska', 'dodatek', 'surówka']
const TYPY = ['samodzielne', 'z_dodatkiem']
const JEDNOSTKI = ['g', 'kg', 'ml', 'l', 'szt.', 'opak.', 'łyżka', 'łyżeczka', 'szklanka', 'do smaku']

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

  const [edycja, setEdycja] = useState(false)
  const [edRodzaj, setEdRodzaj] = useState('')
  const [edTyp, setEdTyp] = useState('samodzielne')
  const [edCzas, setEdCzas] = useState('')
  const [edSkladniki, setEdSkladniki] = useState([])
  const [edPrzepis, setEdPrzepis] = useState('')
  const [saving, setSaving] = useState(false)

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

  const wejdzWEdycje = () => {
    setEdRodzaj(danie?.rodzaj || 'obiad')
    setEdTyp(danie?.TYP || 'samodzielne')
    setEdCzas(danie?.czas_minuty ? String(danie.czas_minuty) : '')
    setEdSkladniki(skladniki.map(sk => ({ ...sk, ilosc: sk.ilosc ? String(sk.ilosc) : '' })))
    setEdPrzepis(przepis || '')
    setEdycja(true)
  }

  const anulujEdycje = () => setEdycja(false)

  const zapiszEdycje = async () => {
    setSaving(true)
    try {
      await supabase.from('dania').delete().eq('Danie', nazwa)

      const filtrowane = edSkladniki.filter(sk => sk.nazwa.trim())
      const wiersze = filtrowane.map((sk, i) => ({
        Danie: nazwa,
        rodzaj: edRodzaj,
        Składnik: sk.nazwa.trim(),
        'Ilość': parseFloat(sk.ilosc) || 0,
        Jednostka: sk.jednostka,
        Kategoria: sk.kategoria,
        ...(i === 0 ? {
          TYP: edTyp,
          czas_minuty: parseInt(edCzas) || null,
          Przepis: edPrzepis.trim() || null,
          zdjecie: danie?.zdjecie || null,
          ulubione,
        } : {}),
      }))

      if (wiersze.length === 0) {
        wiersze.push({
          Danie: nazwa,
          rodzaj: edRodzaj,
          TYP: edTyp,
          czas_minuty: parseInt(edCzas) || null,
          Przepis: edPrzepis.trim() || null,
          zdjecie: danie?.zdjecie || null,
          ulubione,
        })
      }

      const { error } = await supabase.from('dania').insert(wiersze)
      if (error) throw error

      setDanie(prev => ({ ...prev, rodzaj: edRodzaj, TYP: edTyp, czas_minuty: parseInt(edCzas) || null }))
      setSkladniki(edSkladniki.filter(sk => sk.nazwa.trim()).map(sk => ({
        ...sk, ilosc: parseFloat(sk.ilosc) || 0,
      })))
      setPrzepis(edPrzepis.trim() || null)
      setEdycja(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (e) {
      Alert.alert('Błąd', e.message || 'Nie udało się zapisać')
    }
    setSaving(false)
  }

  const zmienZdjecie = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const slug = nazwa.toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '-').replace(/-+/g, '-')
    const ext = asset.uri.split('.').pop() || 'jpg'
    const path = `dania/${slug}-${Date.now()}.${ext}`

    try {
      const response = await fetch(asset.uri)
      const blob = await response.blob()
      const { error: upErr } = await supabase.storage.from('dania-zdjecia').upload(path, blob, { contentType: `image/${ext}` })
      if (upErr) throw upErr

      const { data: pubData } = supabase.storage.from('dania-zdjecia').getPublicUrl(path)
      const url = pubData?.publicUrl
      if (url) {
        await supabase.from('dania').update({ zdjecie: url }).eq('Danie', nazwa)
        setDanie(prev => ({ ...prev, zdjecie: url }))
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zmienić zdjęcia')
    }
  }

  const aktualizujSkladnik = (i, pole, val) => {
    setEdSkladniki(prev => prev.map((sk, idx) => idx === i ? { ...sk, [pole]: val } : sk))
  }

  const usunSkladnik = (i) => {
    setEdSkladniki(prev => prev.length <= 1 ? [{ nazwa: '', ilosc: '', jednostka: 'g', kategoria: 'Inne' }] : prev.filter((_, idx) => idx !== i))
  }

  const dodajSkladnik = () => {
    setEdSkladniki(prev => [...prev, { nazwa: '', ilosc: '', jednostka: 'g', kategoria: 'Inne' }])
  }

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
        <Text style={s.loadingTxt}>Ładowanie...</Text>
      </SafeAreaView>
    )
  }

  if (!danie) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.loadingTxt}>Nie znaleziono przepisu</Text>
      </SafeAreaView>
    )
  }

  const kroki = przepis?.split(/\n+/).filter(Boolean) || []
  const czyGlowne = !['dodatek', 'surówka', 'przekąska'].includes(edRodzaj)

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.headerRow}>
            <Pressable onPress={() => { if (edycja) anulujEdycje(); else router.back() }} hitSlop={12}>
              <Ionicons name={edycja ? 'close' : 'arrow-back'} size={24} color={t.text} />
            </Pressable>
            <View style={s.headerActions}>
              {edycja ? (
                <Pressable style={s.saveBtn} onPress={zapiszEdycje} disabled={saving}>
                  <Text style={s.saveBtnTxt}>{saving ? 'Zapisuję...' : 'Zapisz'}</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable onPress={wejdzWEdycje} hitSlop={8}>
                    <Ionicons name="create-outline" size={22} color={t.mute} />
                  </Pressable>
                  <Pressable onPress={toggleUlubione} hitSlop={8}>
                    <Ionicons name={ulubione ? 'heart' : 'heart-outline'} size={22} color={ulubione ? t.danger : t.mute} />
                  </Pressable>
                  <Pressable onPress={udostepnij} hitSlop={8}>
                    <Ionicons name="share-outline" size={22} color={t.mute} />
                  </Pressable>
                  <Pressable onPress={usunDanie} hitSlop={8}>
                    <Ionicons name="trash-outline" size={22} color={t.mute} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <Pressable onPress={edycja ? zmienZdjecie : undefined}>
            {danie.zdjecie ? (
              <Image source={{ uri: danie.zdjecie }} style={s.hero} />
            ) : (
              <View style={[s.hero, { backgroundColor: getKolor(nazwa), justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 64 }}>{getEmoji(nazwa)}</Text>
                {edycja && <Text style={s.heroEditHint}>Zmień zdjęcie</Text>}
              </View>
            )}
          </Pressable>

          <View style={s.info}>
            <Text style={s.nazwa}>{nazwa}</Text>

            {edycja ? (
              <View style={{ gap: 12 }}>
                <Text style={s.edLabel}>Rodzaj</Text>
                <View style={s.chipRow}>
                  {RODZAJE.map(r => (
                    <Pressable key={r} style={[s.chip, edRodzaj === r && s.chipAktywny]} onPress={() => setEdRodzaj(r)}>
                      <Text style={[s.chipTxt, edRodzaj === r && s.chipTxtAktywny]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {czyGlowne && (
                  <>
                    <Text style={s.edLabel}>Typ</Text>
                    <View style={s.chipRow}>
                      {TYPY.map(tp => (
                        <Pressable key={tp} style={[s.chip, edTyp === tp && s.chipAktywny]} onPress={() => setEdTyp(tp)}>
                          <Text style={[s.chipTxt, edTyp === tp && s.chipTxtAktywny]}>
                            {tp === 'z_dodatkiem' ? 'Z dodatkiem' : 'Samodzielne'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                <Text style={s.edLabel}>Czas (min)</Text>
                <TextInput style={[s.edInput, { width: 100 }]} value={edCzas} onChangeText={setEdCzas} keyboardType="numeric" placeholder="np. 30" placeholderTextColor={t.mute} />
              </View>
            ) : (
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
            )}
          </View>

          <View style={s.sekcja}>
            <Text style={s.sekcjaTytul}>Składniki</Text>
            {edycja ? (
              <View style={{ gap: 8 }}>
                {edSkladniki.map((sk, i) => (
                  <View key={i} style={s.edSkladnikRow}>
                    <TextInput
                      style={[s.edInput, { flex: 1 }]}
                      value={sk.nazwa}
                      onChangeText={v => aktualizujSkladnik(i, 'nazwa', v)}
                      placeholder="Składnik"
                      placeholderTextColor={t.mute}
                    />
                    <TextInput
                      style={[s.edInput, { width: 52 }]}
                      value={sk.ilosc}
                      onChangeText={v => aktualizujSkladnik(i, 'ilosc', v)}
                      keyboardType="numeric"
                      placeholder="Ilość"
                      placeholderTextColor={t.mute}
                    />
                    <Pressable style={s.edUnitBtn} onPress={() => {
                      const idx = JEDNOSTKI.indexOf(sk.jednostka)
                      aktualizujSkladnik(i, 'jednostka', JEDNOSTKI[(idx + 1) % JEDNOSTKI.length])
                    }}>
                      <Text style={s.edUnitTxt}>{sk.jednostka}</Text>
                    </Pressable>
                    <Pressable onPress={() => usunSkladnik(i)} hitSlop={6}>
                      <Ionicons name="close-circle" size={18} color={t.mute} />
                    </Pressable>
                  </View>
                ))}
                <Pressable style={s.edAddRow} onPress={dodajSkladnik}>
                  <Ionicons name="add-circle-outline" size={16} color={t.accent} />
                  <Text style={s.edAddTxt}>Dodaj składnik</Text>
                </Pressable>
              </View>
            ) : (
              skladniki.length > 0 ? skladniki.map((sk, i) => (
                <View key={i} style={s.skladnikRow}>
                  <View style={s.dot} />
                  <Text style={s.skladnikNazwa}>{sk.nazwa}</Text>
                  <Text style={s.skladnikIlosc}>
                    {sk.ilosc > 0 ? `${sk.ilosc} ${sk.jednostka}` : sk.jednostka || ''}
                  </Text>
                </View>
              )) : <Text style={s.pusteLabel}>Brak składników</Text>
            )}
          </View>

          <View style={s.sekcja}>
            <Text style={s.sekcjaTytul}>Przygotowanie</Text>
            {edycja ? (
              <TextInput
                style={[s.edInput, { minHeight: 120 }]}
                value={edPrzepis}
                onChangeText={setEdPrzepis}
                placeholder="Kroki przygotowania..."
                placeholderTextColor={t.mute}
                multiline
                textAlignVertical="top"
              />
            ) : (
              kroki.length > 0 ? kroki.map((krok, i) => (
                <View key={i} style={s.krokRow}>
                  <View style={s.krokNum}>
                    <Text style={s.krokNumTxt}>{i + 1}</Text>
                  </View>
                  <Text style={s.krokTxt}>{krok.replace(/^\d+[\.\)]\s*/, '')}</Text>
                </View>
              )) : <Text style={s.pusteLabel}>Brak przepisu</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { paddingBottom: 40 },
    loadingTxt: { fontFamily: fonts.sans, fontSize: 14, color: t.mute, textAlign: 'center', marginTop: 60 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    saveBtn: {
      backgroundColor: t.accent, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    saveBtnTxt: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '600', color: '#fff' },
    hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: t.surfaceAlt },
    heroEditHint: {
      fontFamily: fonts.sans, fontSize: 12, color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 6, marginTop: 8,
    },
    info: { padding: 20, gap: 10 },
    nazwa: { fontFamily: fonts.serif, fontSize: 28, color: t.text },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 5,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    chipAktywny: { backgroundColor: t.accent },
    chipTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.mute },
    chipTxtAktywny: { color: '#fff' },
    edLabel: {
      fontFamily: fonts.sans, fontSize: 10, fontWeight: '700', color: t.mute,
      letterSpacing: 1, textTransform: 'uppercase',
    },
    edInput: {
      backgroundColor: t.surface, borderRadius: 10, padding: 10,
      fontFamily: fonts.sans, fontSize: 14, color: t.text,
      borderWidth: 1, borderColor: t.border,
    },
    edSkladnikRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    edUnitBtn: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 8,
    },
    edUnitTxt: { fontFamily: fonts.sans, fontSize: 11, fontWeight: '600', color: t.text },
    edAddRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
    edAddTxt: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '500', color: t.accent },
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
    pusteLabel: { fontFamily: fonts.sans, fontSize: 14, color: t.mute, fontStyle: 'italic' },
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
