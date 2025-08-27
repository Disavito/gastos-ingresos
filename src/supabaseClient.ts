import { createClient } from '@supabase/supabase-js';

// Asegúrate de que las variables de entorno estén definidas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidas.');
  // Puedes lanzar un error o manejarlo de otra manera, por ejemplo, deshabilitando la funcionalidad de Supabase.
  throw new Error('Faltan las credenciales de Supabase. Por favor, configura tu archivo .env.');
}

// Inicializa el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase client initialized.');
