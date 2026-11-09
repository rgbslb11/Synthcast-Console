import {configuredRuntime} from './configured-runtime.mjs';
// A fresh runtime per request exercises database-backed recovery; no in-memory state.
Deno.serve(req=>configuredRuntime().publicHandler(req));
