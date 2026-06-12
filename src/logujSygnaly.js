// logujSygnaly.js
// Loguje sygnały preferencji użytkownika do tabeli `preferencje_sygnaly`.
//
// SQL do uruchomienia raz w Supabase (migracja):
// create table preferencje_sygnaly (
//   id bigint primary key generated always as identity,
//   user_id uuid references auth.users not null,
//   household_id uuid not null,
//   danie text not null,
//   akcja text not null,
//     -- wartości akcja:
//     -- 'zaplanuj'    — ręczne dodanie dania do pustego slotu
//     -- 'podmien_in'  — danie wchodzi do zajętego slotu (aktywny wybór)
//     -- 'podmien_out' — danie wypychane z zajętego slotu (aktywne odrzucenie)
//     -- 'usun'        — usunięcie dania z planu
//     -- 'przenies'    — przeniesienie między slotami/dniami (neutralne)
//     -- 'podmien'     — legacy (stary sygnał bez rozróżnienia in/out)
//   kontekst_slot text,
//   kontekst_data date,
//   created_at timestamptz default now()
// );
// alter table preferencje_sygnaly enable row level security;
// -- Zapis: tylko właściciel
// create policy "users own signals write" on preferencje_sygnaly
//   for all using (user_id = auth.uid());
// -- Odczyt: wszyscy członkowie household (żeby profil był rodzinny)
// create policy "household members read signals" on preferencje_sygnaly
//   for select using (
//     household_id in (
//       select household_id from household_members where user_id = auth.uid()
//     )
//   );

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
