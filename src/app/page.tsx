import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const { data: todos } = await supabase.from('todos').select();

  if (!todos) {
    redirect('/login');
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase conectado</h1>
      <ul>
        {todos.map((todo: { id: string; name: string }) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </main>
  );
}
