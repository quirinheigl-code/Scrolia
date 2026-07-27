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
