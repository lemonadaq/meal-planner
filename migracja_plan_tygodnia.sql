-- ════════════════════════════════════════════════════════════
-- Migracja: tabela `plan_tygodnia` — tygodniowa pula dań (nowy tryb "Tydzień")
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
--
-- Zamiast przypisywać dania do dni i slotów, user wybiera zestaw dań
-- na cały tydzień. Jeden wiersz = jedno danie w puli danego tygodnia.
-- `tydzien` to zawsze PONIEDZIAŁEK tygodnia (YYYY-MM-DD).
-- ════════════════════════════════════════════════════════════

create table if not exists plan_tygodnia (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  user_id uuid not null,
  tydzien date not null,
  danie text not null,
  porcje numeric not null default 1,
  created_at timestamptz not null default now(),
  unique (household_id, tydzien, danie)
);

comment on table plan_tygodnia is 'Tygodniowa pula dań (tryb "Tydzień") — danie wybrane na tydzień, bez przypisania do dnia/slotu';
comment on column plan_tygodnia.tydzien is 'Poniedziałek tygodnia, np. 2026-08-03';
comment on column plan_tygodnia.danie is 'Nazwa dania — odpowiada dania."Danie"';

-- ── RLS: wzorzec household jak w pozostałych tabelach ──
-- moj_household_id() to istniejący helper SQL czytający JWT pytającego usera.
-- Brak polityk dla roli anon = brak dostępu (RLS domyślnie blokuje).

alter table plan_tygodnia enable row level security;

create policy "plan_tygodnia select w swoim household"
  on plan_tygodnia for select
  to authenticated
  using (household_id = moj_household_id());

create policy "plan_tygodnia insert w swoim household"
  on plan_tygodnia for insert
  to authenticated
  with check (household_id = moj_household_id() and user_id = auth.uid());

create policy "plan_tygodnia update w swoim household"
  on plan_tygodnia for update
  to authenticated
  using (household_id = moj_household_id())
  with check (household_id = moj_household_id());

create policy "plan_tygodnia delete w swoim household"
  on plan_tygodnia for delete
  to authenticated
  using (household_id = moj_household_id());
