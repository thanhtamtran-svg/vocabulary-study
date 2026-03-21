import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_jHgz4-egQIk9dYaV7HhR5w_MK3AYdC0';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
