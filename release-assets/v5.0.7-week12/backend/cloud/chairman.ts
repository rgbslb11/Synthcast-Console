import {configuredRuntime} from './configured-runtime.mjs';
// Authentication remains the actual Supabase Auth /user verification and QA operator table.
Deno.serve(req=>configuredRuntime().chairmanHandler(req));
