// QA WP API only. Credentials remain inside the server runtime.
// The worker retains its direct, session-scoped advisory-lock connection.
export function wpDatabaseUrl(getenv){
 try{
  if(getenv('SUPABASE_URL')!=='https://xsvdmcipviejxynkdbhq.supabase.co')throw Error();
  const u=new URL(getenv('SUPABASE_DB_URL'));
  if(!['postgres:','postgresql:'].includes(u.protocol)||u.username!=='postgres'||!u.password||u.pathname!=='/postgres')throw Error();
  u.hostname='db.xsvdmcipviejxynkdbhq.supabase.co';u.port='6543';
  return u.toString();
 }catch{throw Error('WP_POOL_CONFIGURATION_INVALID');}
}
