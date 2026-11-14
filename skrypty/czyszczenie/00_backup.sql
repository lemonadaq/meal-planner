-- ════════════════════════════════════════════════════════════
-- Faza 0 — backup przed czyszczeniem bazy dań (2026-11-14)
-- SQL Editor → New query → wklej → Run. Można odpalić drugi raz:
-- tabela backupu, która już istnieje, zostaje nietknięta.
--
-- REST (klucz service) nie wykonuje DDL, dlatego ten krok jest plikiem SQL.
-- ════════════════════════════════════════════════════════════

do $$
declare
  t text;
  tabele text[] := array[
    'dania', 'kalendarz', 'plan_tygodnia', 'korekty_zakupow',
    'skladniki_meta', 'preferencje_sygnaly', 'zakupy_historia',
    'zakupy_cykliczne', 'produkty_w_domu', 'wpisy'
  ];
begin
  foreach t in array tabele loop
    if to_regclass('public.' || t) is null then
      raise notice 'pomijam % — brak tabeli', t;
    elsif to_regclass('public.' || t || '_backup_20261114') is not null then
      raise notice 'pomijam % — backup już jest', t;
    else
      execute format('create table public.%I as select * from public.%I',
                     t || '_backup_20261114', t);
      -- Backup nie może być czytelny przez apkę (anon/authenticated).
      execute format('alter table public.%I enable row level security',
                     t || '_backup_20261114');
      raise notice 'backup % → %_backup_20261114', t, t;
    end if;
  end loop;
end $$;

-- Sprawdzenie: liczby wierszy w oryginale i w backupie mają być równe.
select 'dania' t, (select count(*) from dania) oryginal, (select count(*) from dania_backup_20261114) backup
union all select 'kalendarz', (select count(*) from kalendarz), (select count(*) from kalendarz_backup_20261114)
union all select 'plan_tygodnia', (select count(*) from plan_tygodnia), (select count(*) from plan_tygodnia_backup_20261114)
union all select 'skladniki_meta', (select count(*) from skladniki_meta), (select count(*) from skladniki_meta_backup_20261114);
