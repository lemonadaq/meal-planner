import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, Image, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../shared/supabase'
import { t, fonts, useThemeVersion } from '../shared/theme'
import { useAuth } from '../hooks/useAuth'

const RODZAJE = ['obiad', 'śniadanie', 'kolacja', 'zupa', 'deser', 'przekąska', 'dodatek', 'surówka']
const TYPY = ['samodzielne', 'z_dodatkiem']
const JEDNOSTKI = ['g', 'kg', 'ml', 'l', 'szt.', 'opak.', 'łyżka', 'łyżeczka', 'szklanka', 'do smaku']
const KATEGORIE = ['Warzywa i owoce', 'Mięso i ryby', 'Nabiał', 'Pieczywo', 'Suche / sypkie', 'Przetwory', 'Przyprawy', 'Inne']

const pusty = () => ({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: 'Inne' })

export default function DodajDanieScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const [nazwa, setNazwa] = useState('')
  const [rodzaj, setRodzaj] = useState('obiad')
  const [typ, setTyp] = useState('samodzielne')
  const [czasMinuty, setCzasMinuty] = useState('')
  const [skladniki, setSkladniki] = useState([pusty()])
  const [przepis, setPrzepis] = useState('')
  const [zdjecie, setZdjecie] = useState(null)
  const [saving, setSaving] = useState(false)

  const wybierzZdjecie = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })
    if (!result.canceled && result.assets?.[0]) {
      setZdjecie(result.assets[0])
    }
  }

  const zrobZdjecie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert('Brak uprawnień', 'Zezwól na dostęp do aparatu'); return }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    })
    if (!result.canceled && result.assets?.[0]) {
      setZdjecie(result.assets[0])
    }
  }

  const dodajSkladnik = () => setSkladniki(prev => [...prev, pusty()])

  const aktualizujSkladnik = (i, pole, val) => {
    setSkladniki(prev => prev.map((sk, idx) => idx === i ? { ...sk, [pole]: val } : sk))
  }

  const usunSkladnik = (i) => {
    setSkladniki(prev => prev.length <= 1 ? [pusty()] : prev.filter((_, idx) => idx !== i))
  }

  const zapisz = async () => {
    const trimNazwa = nazwa.trim()
    if (!trimNazwa) { Alert.alert('Błąd', 'Podaj nazwę dania'); return }
    if (!skladniki.some(sk => sk.nazwa.trim())) { Alert.alert('Błąd', 'Dodaj przynajmniej jeden składnik'); return }

    setSaving(true)
    try {
      const { data: istn } = await supabase.from('dania').select('"Danie"').eq('Danie', trimNazwa).limit(1)
      if (istn?.length) { Alert.alert('Błąd', 'Danie o tej nazwie już istnieje'); setSaving(false); return }

      let zdjecieUrl = null
      if (zdjecie) {
        const slug = trimNazwa.toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '-').replace(/-+/g, '-')
        const ext = zdjecie.uri.split('.').pop() || 'jpg'
        const path = `dania/${slug}-${Date.now()}.${ext}`
        const response = await fetch(zdjecie.uri)
        const blob = await response.blob()
        const { error: upErr } = await supabase.storage.from('dania-zdjecia').upload(path, blob, { contentType: `image/${ext}` })
        if (!upErr) {
          const { data: pubData } = supabase.storage.from('dania-zdjecia').getPublicUrl(path)
          zdjecieUrl = pubData?.publicUrl
        }
      }

      const filtrowane = skladniki.filter(sk => sk.nazwa.trim())
      const wiersze = filtrowane.map((sk, i) => ({
        Danie: trimNazwa,
        rodzaj,
        Składnik: sk.nazwa.trim(),
        'Ilość': parseFloat(sk.ilosc) || 0,
        Jednostka: sk.jednostka,
        Kategoria: sk.kategoria,
        ...(i === 0 ? {
          TYP: typ,
          czas_minuty: parseInt(czasMinuty) || null,
          Przepis: przepis.trim() || null,
          zdjecie: zdjecieUrl,
        } : {}),
      }))

      const { error } = await supabase.from('dania').insert(wiersze)
      if (error) throw error

      Alert.alert('Gotowe', `Dodano: ${trimNazwa}`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e) {
      Alert.alert('Błąd', e.message || 'Nie udało się zapisać')
    }
    setSaving(false)
  }

  const czyGlowne = !['dodatek', 'surówka', 'przekąska'].includes(rodzaj)
  const s = makeS()

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={t.text} />
            </Pressable>
            <Text style={s.tytul}>Nowe danie</Text>
            <Pressable style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={zapisz} disabled={saving}>
              <Text style={s.saveTxt}>{saving ? 'Zapisuję...' : 'Zapisz'}</Text>
            </Pressable>
          </View>

          <Pressable style={s.photoArea} onPress={() => {
            Alert.alert('Zdjęcie', 'Wybierz źródło', [
              { text: 'Aparat', onPress: zrobZdjecie },
              { text: 'Galeria', onPress: wybierzZdjecie },
              { text: 'Anuluj', style: 'cancel' },
            ])
          }}>
            {zdjecie ? (
              <Image source={{ uri: zdjecie.uri }} style={s.photoImg} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={t.mute} />
                <Text style={s.photoTxt}>Dodaj zdjęcie</Text>
              </View>
            )}
          </Pressable>

          <Text style={s.label}>Nazwa</Text>
          <TextInput style={s.input} value={nazwa} onChangeText={setNazwa} placeholder="np. Spaghetti bolognese" placeholderTextColor={t.mute} />

          <Text style={s.label}>Rodzaj</Text>
          <View style={s.chipRow}>
            {RODZAJE.map(r => (
              <Pressable key={r} style={[s.chip, rodzaj === r && s.chipAktywny]} onPress={() => setRodzaj(r)}>
                <Text style={[s.chipTxt, rodzaj === r && s.chipTxtAktywny]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {czyGlowne && (
            <>
              <Text style={s.label}>Typ</Text>
              <View style={s.chipRow}>
                <Pressable style={[s.chip, typ === 'samodzielne' && s.chipAktywny]} onPress={() => setTyp('samodzielne')}>
                  <Text style={[s.chipTxt, typ === 'samodzielne' && s.chipTxtAktywny]}>Samodzielne</Text>
                </Pressable>
                <Pressable style={[s.chip, typ === 'z_dodatkiem' && s.chipAktywny]} onPress={() => setTyp('z_dodatkiem')}>
                  <Text style={[s.chipTxt, typ === 'z_dodatkiem' && s.chipTxtAktywny]}>Z dodatkiem</Text>
                </Pressable>
              </View>
            </>
          )}

          <Text style={s.label}>Czas przygotowania (min)</Text>
          <TextInput style={[s.input, { width: 100 }]} value={czasMinuty} onChangeText={setCzasMinuty} keyboardType="numeric" placeholder="np. 30" placeholderTextColor={t.mute} />

          <Text style={s.label}>Składniki</Text>
          {skladniki.map((sk, i) => (
            <View key={i} style={s.skladnikRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={sk.nazwa}
                onChangeText={v => aktualizujSkladnik(i, 'nazwa', v)}
                placeholder="Składnik"
                placeholderTextColor={t.mute}
              />
              <TextInput
                style={[s.input, { width: 56 }]}
                value={sk.ilosc}
                onChangeText={v => aktualizujSkladnik(i, 'ilosc', v)}
                keyboardType="numeric"
                placeholder="Ilość"
                placeholderTextColor={t.mute}
              />
              <Pressable style={s.unitBtn} onPress={() => {
                const idx = JEDNOSTKI.indexOf(sk.jednostka)
                aktualizujSkladnik(i, 'jednostka', JEDNOSTKI[(idx + 1) % JEDNOSTKI.length])
              }}>
                <Text style={s.unitTxt}>{sk.jednostka}</Text>
              </Pressable>
              <Pressable onPress={() => usunSkladnik(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={t.mute} />
              </Pressable>
            </View>
          ))}
          <Pressable style={s.addBtn} onPress={dodajSkladnik}>
            <Ionicons name="add-circle-outline" size={18} color={t.accent} />
            <Text style={s.addTxt}>Dodaj składnik</Text>
          </Pressable>

          <Text style={s.label}>Przepis (opcjonalnie)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={przepis}
            onChangeText={setPrzepis}
            placeholder="Kroki przygotowania..."
            placeholderTextColor={t.mute}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, paddingBottom: 60 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 16,
    },
    tytul: { fontFamily: fonts.serif, fontSize: 22, color: t.text },
    saveBtn: {
      backgroundColor: t.accent, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    saveTxt: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '600', color: '#fff' },
    photoArea: {
      width: '100%', aspectRatio: 16 / 9, borderRadius: 14,
      overflow: 'hidden', marginBottom: 16,
      backgroundColor: t.surfaceAlt,
    },
    photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    photoPlaceholder: {
      flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6,
      borderWidth: 2, borderColor: t.border, borderStyle: 'dashed', borderRadius: 14,
    },
    photoTxt: { fontFamily: fonts.sans, fontSize: 13, color: t.mute },
    label: {
      fontFamily: fonts.sans, fontSize: 11, fontWeight: '700', color: t.mute,
      letterSpacing: 1.2, textTransform: 'uppercase',
      marginTop: 16, marginBottom: 8,
    },
    input: {
      backgroundColor: t.surface, borderRadius: 10, padding: 12,
      fontFamily: fonts.sans, fontSize: 15, color: t.text,
      borderWidth: 1, borderColor: t.border,
    },
    textarea: { minHeight: 100 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    chipAktywny: { backgroundColor: t.accent },
    chipTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.mute },
    chipTxtAktywny: { color: '#fff' },
    skladnikRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
    },
    unitBtn: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 10,
    },
    unitTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.text },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 8,
    },
    addTxt: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '500', color: t.accent },
  })
}
