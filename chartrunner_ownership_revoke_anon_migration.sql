-- ChartRunner — Nachtrag zur Ownership-Migration: EXECUTE für `anon` entziehen.
--
-- Warum es diese Datei gibt: `chartrunner_ownership_migration.sql` hat
-- `revoke execute ... from public` gemacht und die Rechte danach gezielt
-- vergeben. Das reicht in blankem Postgres — in einem Supabase-Projekt nicht.
-- Supabase hat `ALTER DEFAULT PRIVILEGES` gesetzt, das EXECUTE auf NEU
-- ANGELEGTE Funktionen in `public` direkt an `anon` und `authenticated`
-- vergibt. Dieser Zuschuss geht nicht an PUBLIC, sondern an die Rollen selbst;
-- ein `revoke ... from public` entfernt ihn deshalb nicht. Nach dem ersten
-- Lauf hatte `anon` also auf allen fünf RPCs Ausführungsrecht.
--
-- Gefährlich war das nicht: die Funktionen prüfen `auth.uid()` selbst und
-- liefern ohne JWT die leere Menge bzw. eine Ablehnung. Aber die zweite Schicht
-- fehlte, und im CI gegen blankes Postgres tritt der Fall gar nicht auf — dort
-- gibt es diese Default-Privileges nicht. (Der Migrationstest stellt sie seit
-- diesem Nachtrag nach, sonst prüfte er eine Datenbank, die es nicht gibt.)
--
-- Auf der Live-Datenbank ist genau dieser Block bereits angewandt. Er steht
-- zusätzlich am Ende von `chartrunner_ownership_migration.sql`, damit ein
-- frisches Supabase-Projekt nicht wieder mit offenen Rechten startet.
-- Mehrfach ausführbar; ein `revoke` ohne bestehendes Recht ist ein No-op.

revoke execute on function public.cr_owner_is_caller(text, text)                   from anon, authenticated;
revoke execute on function public.cr_ownership_list(text, text)                    from anon;
revoke execute on function public.cr_ownership_claim(text, text, text, text, text) from anon;
revoke execute on function public.cr_loadout_get(text, text)                       from anon;
revoke execute on function public.cr_loadout_set(text, text, jsonb, timestamptz)   from anon;
