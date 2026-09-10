import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tbvutqehssdwyqescteb.supabase.co";
const SUPABASE_KEY = "sb_publishable_ccu_oJWKXd-IR-au3oySVw_9tABiXn_";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);