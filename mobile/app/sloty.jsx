import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist'
import { supabase } from '../shared/supabase'
import { t, fonts, useThemeVersion } from '../shared/theme'
import { useSloty, sanityzuj } from '../shared/useSloty'
import { useAuth } from '../hooks/useAuth'

const DNI_LABELS = [
  { id: 'pon', label: 'Poniedziałek' },
  { id: 'wt', label: 'Wtorek' },
  { id: 'sr', label: 'Środa' },
  { id: 'czw', label: 'Czwartek' },
  { id: 'pt', label: 'Piątek' },
  { id: 'sob', label: 'Sobota' },
  { id: 'nd', label: 'Niedziela' },
]

const KOLORY = ['#C04E2C', '#4D7C4D', '#3B7DD8', '#D4A017', '#8B5CF6', '#E06090', '#2AA198', '#F59E0B']

export default function SlotyScreen() {
  const _v = useThemeVersion()
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState(null)
  const [wybranyDzien, setWybranyDzien] = useState('pon')
  const [nowySlotNazwa, setNowySlotNazwa] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('household_members').select('household_id')
      .eq('user_id', user.id).limit(1).single()
      .then(({ data }) => { if (data) setHouseholdId(data.household_id) })
  }, [user])

  const { config: slotyConfig, zapisz } = useSloty(householdId)
  const cfg = sanityzuj(slotyConfig)

  const slotyDnia = (cfg.dni?.[wybranyDzien] || []).map(id => {
    const slot = (cfg.sloty || []).find(s => s.id === id)
    return slot || { id, nazwa: id, kolor: '#999' }
  })

  const dodajSlot = async () => {
    const nazwa = nowySlotNazwa.trim()
    if (!nazwa) { Alert.alert('Błąd', 'Podaj nazwę slotu'); return }
    const id = nazwa.toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '_')
    if ((cfg.sloty || []).some(s => s.id === id)) {
      Alert.alert('Błąd', 'Slot o takiej nazwie już istnieje')
      return
    }

    const kolor = KOLORY[(cfg.sloty || []).length % KOLORY.length]
    const noweSloty = [...(cfg.sloty || []), { id, nazwa, kolor }]
    const noweDni = { ...cfg.dni }
    noweDni[wybranyDzien] = [...(noweDni[wybranyDzien] || []), id]

    await zapisz({ sloty: noweSloty, dni: noweDni })
    setNowySlotNazwa('')
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const usunSlotZDnia = async (slotId) => {
    const noweDni = { ...cfg.dni }
    noweDni[wybranyDzien] = (noweDni[wybranyDzien] || []).filter(id => id !== slotId)
    await zapisz({ ...cfg, dni: noweDni })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const dodajIstniejacy = (slotId) => {
    if ((cfg.dni?.[wybranyDzien] || []).includes(slotId)) return
    const noweDni = { ...cfg.dni }
    noweDni[wybranyDzien] = [...(noweDni[wybranyDzien] || []), slotId]
    zapisz({ ...cfg, dni: noweDni })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const kopiujDzien = (zDnia) => {
    const noweDni = { ...cfg.dni }
    noweDni[wybranyDzien] = [...(noweDni[zDnia] || [])]
    zapisz({ ...cfg, dni: noweDni })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  const onDragEnd = ({ data: nowaKolejnosc }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const noweDni = { ...cfg.dni }
    noweDni[wybranyDzien] = nowaKolejnosc.map(s => s.id)
    zapisz({ ...cfg, dni: noweDni })
  }

  const niedodane = (cfg.sloty || []).filter(s => !(cfg.dni?.[wybranyDzien] || []).includes(s.id))

  const s = makeS()

  const renderSlot = ({ item: slot, drag, isActive }) => (
    <ScaleDecorator>
      <Pressable
        style={[s.slotRow, isActive && s.slotRowActive]}
        onLongPress={drag}
        delayLongPress={150}
      >
        <Ionicons name="reorder-three" size={18} color={t.mute} style={{ marginRight: 4 }} />
        <View style={[s.slotKolor, { backgroundColor: slot.kolor }]} />
        <Text style={s.slotNazwa}>{slot.nazwa}</Text>
        <Pressable onPress={() => usunSlotZDnia(slot.id)} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={t.mute} />
        </Pressable>
      </Pressable>
    </ScaleDecorator>
  )

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </Pressable>
        <Text style={s.tytul}>Sloty posiłków</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dniStrip} contentContainerStyle={s.dniStripContent}>
        {DNI_LABELS.map(d => (
          <Pressable
            key={d.id}
            style={[s.dzienPill, wybranyDzien === d.id && s.dzienPillAktywny]}
            onPress={() => setWybranyDzien(d.id)}
          >
            <Text style={[s.dzienTxt, wybranyDzien === d.id && s.dzienTxtAktywny]}>
              {d.label.slice(0, 3)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <DraggableFlatList
        data={slotyDnia}
        keyExtractor={item => item.id}
        renderItem={renderSlot}
        onDragEnd={onDragEnd}
        onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <Text style={s.label}>Sloty na {DNI_LABELS.find(d => d.id === wybranyDzien)?.label}</Text>
        }
        ListEmptyComponent={
          <Text style={s.pusteLabel}>Brak slotów na ten dzień</Text>
        }
        ListFooterComponent={
          <View>
            {niedodane.length > 0 && (
              <View style={s.sekcja}>
                <Text style={s.subLabel}>Dodaj istniejący slot</Text>
                <View style={s.chipRow}>
                  {niedodane.map(slot => (
                    <Pressable key={slot.id} style={s.chipSlot} onPress={() => dodajIstniejacy(slot.id)}>
                      <View style={[s.chipDot, { backgroundColor: slot.kolor }]} />
                      <Text style={s.chipSlotTxt}>{slot.nazwa}</Text>
                      <Ionicons name="add" size={14} color={t.accent} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={s.sekcja}>
              <Text style={s.subLabel}>Nowy slot</Text>
              <View style={s.nowyRow}>
                <TextInput
                  style={s.nowyInput}
                  value={nowySlotNazwa}
                  onChangeText={setNowySlotNazwa}
                  placeholder="np. Podwieczorek"
                  placeholderTextColor={t.mute}
                />
                <Pressable style={s.nowyBtn} onPress={dodajSlot}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={s.sekcja}>
              <Text style={s.subLabel}>Kopiuj z innego dnia</Text>
              <View style={s.chipRow}>
                {DNI_LABELS.filter(d => d.id !== wybranyDzien).map(d => (
                  <Pressable key={d.id} style={s.chipKopia} onPress={() => kopiujDzien(d.id)}>
                    <Text style={s.chipKopiaTxt}>{d.label.slice(0, 3)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  )
}

function makeS() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    listContent: { padding: 16, paddingBottom: 40 },
    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    },
    tytul: { fontFamily: fonts.serif, fontSize: 22, color: t.text },
    dniStrip: { marginBottom: 8, paddingHorizontal: 16 },
    dniStripContent: { gap: 6 },
    dzienPill: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
      backgroundColor: t.surfaceAlt,
    },
    dzienPillAktywny: { backgroundColor: t.accent },
    dzienTxt: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', color: t.mute },
    dzienTxtAktywny: { color: '#fff' },
    label: {
      fontFamily: fonts.sans, fontSize: 11, fontWeight: '700', color: t.mute,
      letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
    },
    slotRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: t.surface, borderRadius: 12, padding: 14, marginBottom: 6,
      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    slotRowActive: {
      shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
      transform: [{ scale: 1.03 }],
    },
    slotKolor: { width: 10, height: 10, borderRadius: 5 },
    slotNazwa: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '600', color: t.text, flex: 1 },
    pusteLabel: { fontFamily: fonts.sans, fontSize: 14, color: t.mute, fontStyle: 'italic', marginBottom: 16 },
    sekcja: { marginTop: 20 },
    subLabel: {
      fontFamily: fonts.sans, fontSize: 10, fontWeight: '700', color: t.mute,
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chipSlot: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 7,
    },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipSlotTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.text },
    chipKopia: {
      backgroundColor: t.surfaceAlt, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    chipKopiaTxt: { fontFamily: fonts.sans, fontSize: 12, fontWeight: '600', color: t.mute },
    nowyRow: { flexDirection: 'row', gap: 8 },
    nowyInput: {
      flex: 1, backgroundColor: t.surface, borderRadius: 10, padding: 12,
      fontFamily: fonts.sans, fontSize: 14, color: t.text,
      borderWidth: 1, borderColor: t.border,
    },
    nowyBtn: {
      width: 44, height: 44, borderRadius: 10,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center',
    },
  })
}
