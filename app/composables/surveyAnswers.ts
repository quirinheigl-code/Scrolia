export type Scrollytelling = 'soziokratie' | 'technokratie'

interface SaveSurveyAnswerOptions {
  scrollytelling: Scrollytelling
  questionNumber: number
  choice: 'answer1' | 'answer2'
  text: string
}

// One row per answered question (upserted, so re-answering the same
// question overwrites the previous row instead of adding a duplicate — see
// the unique constraint in supabase/schema.sql). Failures are logged, not
// thrown: a lost answer shouldn't interrupt someone reading the story.
export async function saveSurveyAnswer(options: SaveSurveyAnswerOptions): Promise<void> {
  const supabase = useSupabase()
  const sessionId = useSessionId()

  const { error } = await supabase
    .from('survey_answers')
    .upsert(
      {
        session_id: sessionId,
        scrollytelling: options.scrollytelling,
        question_number: options.questionNumber,
        answer_choice: options.choice === 'answer1' ? 'A' : 'B',
        answer_text: options.text
      },
      { onConflict: 'session_id,scrollytelling,question_number' }
    )

  if (error) {
    console.error('Failed to save survey answer:', error)
  }
}

// How many of this browser's own answers (for this story) were "Antwort 1"
// — drives the Zustimmungsrate feedback graphic, which has one variant per
// possible count (0..8, in 12.5% steps). Falls back to 0 on failure rather
// than throwing, same as the save path.
export async function fetchOwnAntwort1Count(scrollytelling: Scrollytelling): Promise<number> {
  const supabase = useSupabase()
  const sessionId = useSessionId()

  const { data, error } = await supabase
    .from('survey_answers')
    .select('answer_choice')
    .eq('session_id', sessionId)
    .eq('scrollytelling', scrollytelling)

  if (error) {
    console.error('Failed to fetch survey answers:', error)
    return 0
  }

  return data.filter(row => row.answer_choice === 'A').length
}

// Every answer from every browser, for this story — the Barometer's own
// "Abstimmungsverhalten aller User*Innen" overview, unlike the single-user
// counts above. Keyed by question_number (1..8); missing questions (nobody
// has answered yet) simply have no entry.
export async function fetchAnswerCounts(scrollytelling: Scrollytelling): Promise<Record<number, { a: number; b: number }>> {
  const supabase = useSupabase()
  const counts: Record<number, { a: number; b: number }> = {}

  const { data, error } = await supabase
    .from('survey_answers')
    .select('question_number, answer_choice')
    .eq('scrollytelling', scrollytelling)

  if (error) {
    console.error('Failed to fetch answer counts:', error)
    return counts
  }

  for (const row of data) {
    const bucket = counts[row.question_number] ?? { a: 0, b: 0 }
    if (row.answer_choice === 'A') bucket.a++
    else if (row.answer_choice === 'B') bucket.b++
    counts[row.question_number] = bucket
  }

  return counts
}
