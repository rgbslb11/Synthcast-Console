// Explicit in-page confirmations; no credentials or browser security changes.
(()=>{let active=null;
globalThis.gamecastConfirm=({title,message,witness,current})=>{
 if(active)return Promise.resolve(false);
 return new Promise(resolve=>{
  const origin=document.activeElement,card=origin?.closest?.('[data-game]'),gameId=card?.dataset.game,originText=origin?.textContent;
  const dialog=document.createElement('dialog');dialog.className='gc-confirm';dialog.setAttribute('aria-labelledby','gc-confirm-title');dialog.setAttribute('aria-describedby','gc-confirm-message');
  const heading=document.createElement('h2');heading.id='gc-confirm-title';heading.textContent=title;
  const description=document.createElement('p');description.id='gc-confirm-message';description.textContent=message;
  const feedback=document.createElement('p');feedback.className='gc-confirm-feedback';feedback.setAttribute('role','alert');
  const actions=document.createElement('div');actions.className='gc-confirm-actions';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.autofocus=true;
  const approve=document.createElement('button');approve.type='button';approve.textContent=title;approve.className='primary';
  actions.append(cancel,approve);dialog.append(heading,description,feedback,actions);document.body.append(dialog);active=dialog;
  let accepted=false,settled=false;
  const finish=ok=>{if(settled)return;settled=true;accepted=ok;approve.disabled=true;dialog.close();};
  cancel.addEventListener('click',()=>finish(false));
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
  approve.addEventListener('click',()=>{
   if(approve.disabled)return;
   if(current()!==witness){approve.disabled=true;feedback.textContent='This game changed. Cancel and review the current state before confirming again.';cancel.focus();return;}
   finish(true);
  });
  dialog.addEventListener('close',()=>{
   active=null;dialog.remove();
   let target=origin?.isConnected?origin:null;
   if(!target&&gameId)target=[...document.querySelectorAll('[data-game="'+gameId+'"] button')].find(b=>b.textContent===originText);
   (target||document.getElementById('teamSearch'))?.focus();resolve(accepted);
  },{once:true});
  dialog.showModal();cancel.focus();
 });
};
})();
