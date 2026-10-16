import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('caipo_token')?.value;

  if (!token) {
    redirect('/login');
  }

  const usuario = await verifyToken(token);
  if (!usuario) redirect('/login');

  redirect(usuario.primeiro_acesso ? '/onboarding' : '/dashboard');
}
