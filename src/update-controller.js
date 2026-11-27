// Explicit state machine: no silent returns and no reliance on controllerchange alone.
export async function applyUpdate(registration, {reload,progress,fail,timeoutMs=12000}) {
  progress('Checking for updates…');
  if (!registration) { fail('Update could not finish. Your plans are saved; please retry.'); return; }
  let worker=registration.waiting;
  if(!worker){
    // The waiting worker may already have activated in another tab.
    if(registration.active?.state==='activated'&&!registration.installing){reload();return;}
    fail('Update is still preparing. Please try again shortly.');return;
  }
  progress('Updating…');
  return new Promise(resolve=>{
    let finished=false,timer;
    const finish=(ok,message)=>{
      if(finished)return;finished=true;clearTimeout(timer);worker.removeEventListener('statechange',changed);
      if(ok)reload();else fail(message);resolve();
    };
    const changed=()=>{
      if(worker.state==='activated')finish(true);
      if(worker.state==='redundant')finish(false,'Update could not finish. Your plans are saved; please retry.');
    };
    worker.addEventListener('statechange',changed);
    timer=setTimeout(()=>{
      if(worker.state==='activated')finish(true);
      else finish(false,'Update could not finish. Your plans are saved; please retry.');
    },timeoutMs);
    try{worker.postMessage({type:'ACTIVATE_UPDATE'});changed();}catch{finish(false,'Update could not finish. Your plans are saved; please retry.');}
  });
}
