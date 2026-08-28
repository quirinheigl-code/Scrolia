-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- One row per answered question, so answers can be aggregated later
-- (per scrollytelling, per question_number) without touching this schema.

create table if not exists public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  scrollytelling text not null check (scrollytelling in ('soziokratie', 'technokratie')),
  question_number smallint not null check (question_number between 1 and 8),
  answer_choice text not null check (answer_choice in ('A', 'B')),
  answer_text text not null,
  created_at timestamptz not null default now(),
  -- Re-answering a question (e.g. scrolling back and changing the choice)
  -- updates this row instead of adding a duplicate.
  unique (session_id, scrollytelling, question_number)
);

alter table public.survey_answers enable row level security;

-- The browser only ever uses the anon public key (by design — access
-- control here is RLS, not secrecy of the key). Anonymous visitors may
-- write their own answers (insert and update, for the upsert), and read
-- rows back (needed for the feedback screen's own Zustimmungsrate, computed
-- client-side from this browser's own answers) — but there's still no
-- delete policy: nobody can remove rows through the public client.
-- Aggregation across all visitors happens via the Supabase dashboard or the
-- service role key, which bypass RLS entirely.
--
-- Caveat: since there's no real login, "session_id" is just a client-
-- supplied localStorage value, not a cryptographically verified identity —
-- none of these policies can actually confine a client to only its own
-- rows. In particular, the select policy below (`using (true)`) means
-- anyone with the anon key could read every row, not just their own
-- session's, by omitting the session_id filter the app itself applies.
-- That's an accepted tradeoff of the anonymous-without-login requirement —
-- revisit if the data ever needs to stay private between visitors.
create policy "anon can insert survey answers"
  on public.survey_answers
  for insert
  to anon
  with check (true);

create policy "anon can update survey answers"
  on public.survey_answers
  for update
  to anon
  using (true)
  with check (true);

create policy "anon can select survey answers"
  on public.survey_answers
  for select
  to anon
  using (true);
