'use strict';
// GameCast 4.2.2 packaging shim: isolated cloud endpoint and local operator namespace.
(() => {
  const FROM = 'https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2';
  const TO   = 'https://percrnamjzetzjjuxuuw.supabase.co/functions/v1/gamecast-week3-v4-2-2';
  const OLD_STORE = 'synthcastGameCast42Operator';
  const NEW_STORE = 'synthcastGameCast422Operator';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') input = input.replace(FROM, TO);
    else if (input instanceof Request && input.url.startsWith(FROM)) input = new Request(input.url.replace(FROM, TO), input);
    return nativeFetch(input, init);
  };
  const nativeGet = Storage.prototype.getItem, nativeSet = Storage.prototype.setItem, nativeRemove = Storage.prototype.removeItem;
  Storage.prototype.getItem = function(key) { return nativeGet.call(this, key === OLD_STORE ? NEW_STORE : key); };
  Storage.prototype.setItem = function(key, value) { return nativeSet.call(this, key === OLD_STORE ? NEW_STORE : key, value); };
  Storage.prototype.removeItem = function(key) { return nativeRemove.call(this, key === OLD_STORE ? NEW_STORE : key); };
})();
