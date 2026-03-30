import { redirect } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

function getDisplayName(user: SupabaseUser) {
  const metadataName = user.user_metadata?.name;
  return typeof metadataName === 'string' && metadataName.trim().length > 0 ? metadataName.trim() : null;
}

async function syncUser(user: SupabaseUser) {
  const email = user.email ?? `${user.id}@placeholder.invalid`;

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email,
      name: getDisplayName(user),
    },
    create: {
      id: user.id,
      email,
      name: getDisplayName(user),
    },
  });
}

export async function getOptionalAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireAuthUser() {
  const user = await getOptionalAuthUser();

  if (!user) {
    redirect('/auth');
  }

  await syncUser(user);
  return user;
}
