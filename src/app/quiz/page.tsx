import { redirect } from 'next/navigation';
import { isComplete } from '@/domain/flow';
import { currentSession } from '@/server/session';
import { QuizRunner } from '@/ui/QuizRunner';

export const dynamic = 'force-dynamic';

export default async function QuizPage() {
  const session = await currentSession();
  if (!session) redirect('/');
  if (isComplete(session.answers) && session.lead) redirect('/result');
  return <QuizRunner initialAnswers={session.answers} />;
}
