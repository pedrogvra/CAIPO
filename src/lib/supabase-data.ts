type SupabaseQueryParams = Record<string, string | number | boolean | undefined>;

function getSupabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim();

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
}

function buildQueryString(params: SupabaseQueryParams = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([name, value]) => {
    if (value === undefined || value === null) return;
    searchParams.append(name, String(value));
  });

  return searchParams.toString();
}

function getHeaders({ preferReturnRepresentation = false, contentType = true, upsert = false } = {}) {
  const { key } = getSupabaseConfig();

  const headers: Record<string, string> = {
    apikey: key || '',
    Authorization: `Bearer ${key || ''}`,
    Accept: 'application/json',
  };

  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }

  const preferParts: string[] = [];
  if (preferReturnRepresentation) {
    preferParts.push('return=representation');
  }
  if (upsert) {
    preferParts.push('resolution=merge-duplicates');
  }

  if (preferParts.length > 0) {
    headers['Prefer'] = preferParts.join(',');
  }

  return headers;
}

async function request<T>(table: string, init: RequestInit, params: SupabaseQueryParams = {}) {
  const { url, isConfigured } = getSupabaseConfig();

  if (!isConfigured || !url) {
    throw new Error('Supabase não está configurado.');
  }

  const { on_conflict, ...cleanParams } = params;
  const queryString = buildQueryString(cleanParams);
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${table}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(endpoint, {
    ...init,
    headers: {
      ...getHeaders({
        preferReturnRepresentation: init.method === 'POST' || init.method === 'PATCH' || init.method === 'PUT',
        contentType: init.method !== 'GET' && init.method !== 'DELETE',
        upsert: Boolean(on_conflict),
      }),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return response.text() as T;
}

export function getSupabaseConnectionStatus() {
  const { url, key, isConfigured } = getSupabaseConfig();
  return {
    isConfigured,
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
    url,
  };
}

export async function supabaseSelect<T>(table: string, params: SupabaseQueryParams = {}) {
  return request<T>(table, { method: 'GET' }, params);
}

export async function supabaseInsert<T>(table: string, values: unknown, params: SupabaseQueryParams = {}) {
  return request<T>(table, {
    method: 'POST',
    body: JSON.stringify(values),
  }, params);
}

export async function supabaseUpdate<T>(table: string, values: unknown, params: SupabaseQueryParams = {}) {
  return request<T>(table, {
    method: 'PATCH',
    body: JSON.stringify(values),
  }, params);
}

export async function supabaseDelete<T>(table: string, params: SupabaseQueryParams = {}) {
  return request<T>(table, { method: 'DELETE' }, params);
}
