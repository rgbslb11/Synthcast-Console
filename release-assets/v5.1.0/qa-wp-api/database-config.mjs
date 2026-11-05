// QA API only. Keep the worker's session-level advisory-lock connection unchanged.
export function wpDatabaseUrl(getenv){
 const pooled=getenv('GAMECAST_V510_WP_DATABASE_URL');
 if(!pooled)return getenv('SUPABASE_DB_URL');
 let u;try{u=new URL(pooled);}catch{throw Error('WP_POOL_CONFIGURATION_INVALID');}
 if(!['postgres:','postgresql:'].includes(u.protocol)||!u.hostname.endsWith('.pooler.supabase.com')||u.port!=='6543'||!decodeURIComponent(u.username).endsWith('.xsvdmcipviejxynkdbhq')||!u.password||u.pathname!=='/postgres')throw Error('WP_POOL_CONFIGURATION_INVALID');
 return pooled;
}
