import {createConfiguredRuntime} from './configured-runtime.mjs';
Deno.serve(req=>createConfiguredRuntime().chairmanHandler(req));
