import {createConfiguredRuntime} from '../../../deployment/configured-runtime.mjs';
Deno.serve(createConfiguredRuntime().publicHandler);
