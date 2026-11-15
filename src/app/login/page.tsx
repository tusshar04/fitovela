import { redirect } from 'next/navigation';
import { loggedInPhone } from '@/server/auth';
import { LoginClient } from '@/ui/LoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await loggedInPhone()) redirect('/my-plans');
  return <LoginClient />;
}
