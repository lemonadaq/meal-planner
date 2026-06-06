// logujSygnaly.js
// Loguje sygnały preferencji użytkownika do tabeli `preferencje_sygnaly`.
// Wymaga migracji SQL w Supabase (patrz niżej).
// Funkcja cicho pomija błąd jeśli tabela jeszcze nie istnieje.
//
// SQL do uruchomienia raz w Supabase:
// create table preferencje_sygnaly (
//   id bigint primary key generated always as identity,
//   user_id uuid references auth.users not null,
//   household_id uuid not null,
//   danie text not null,
//   akcja text not null,           -- 'zaplanuj' | 'usun' | 'przenies' | 'podmien'
//   kontekst_slot text,
//   kontekst_data date,
//   created_at timestamptz default now()
// );
// alter table preferencje_sygnaly enable row level security;
// create policy "users own signals" on preferencje_sygnaly
//   for all using (user_id = auth.uid());

import { supabase } from './supabase'

export function logujSygnal({ userId, householdId, danie, akcja, kontekstSlot = null, kontekstData = null }) {
  if (!userId || !householdId || !danie || !akcja) return
  supabase.from('preferencje_sygnaly').insert({
    user_id: userId,
    household_id: householdId,
    danie,
    akcja,
    kontekst_slot: kontekstSlot,
    kontekst_data: kontekstData,
  }).then(({ error }) => {
    if (error && error.code !== '42P01') {
      console.warn('[sygnal]', error.message)
    }
  })
}
