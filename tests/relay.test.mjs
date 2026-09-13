import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import worker, {officialOrigin} from '../src/worker.js';
const template = await readFile(new URL('../src/client.user.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../src/runtime.js', import.meta.url), 'utf8');
const code = template.replace('"__RELAY_ORIGIN__"', '"https://my-relay.pages.dev"');
function harness(mode='relay') {
  const timeouts = new Map(), intervals = new Map(), events = new Map(), nodes = [], warnings = [];
  let next=0;
  function element(tag) {
    const node={tag, tagName:tag.toUpperCase(),style:{},handlers:new Map(),attrs:{}, getBoundingClientRect:()=>({width:340,height:180,left:448,right:788}), focus(){}, children:[], removed:false, append(...children){this.children.push(...children)}, remove(){this.removed=true}, setAttribute(key,value){this.attrs[key]=value}, addEventListener(key,fn){this.handlers.set(key,fn)},removeEventListener(key){this.handlers.delete(key)}, attachShadow(){this.shadow=element('shadow');return this.shadow}};
    nodes.push(node);return node;
  }
  const document={readyState:'complete',head:element('head'),documentElement:element('html'),body:element('body'),createElement:element,addEventListener:(key,fn)=>events.set('doc:'+key,fn),removeEventListener:key=>events.delete('doc:'+key)};
  const window={setTimeout:(fn,ms)=>{timeouts.set(++next,{fn,ms});return next},clearTimeout:id=>timeouts.delete(id),innerWidth:800,innerHeight:600,setInterval:fn=>{intervals.set(++next,fn);return next},clearInterval:id=>intervals.delete(id),addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key),alert:text=>warnings.push(text)};
  const ctx=vm.createContext({window,document,location:{pathname:'/R131/BondageClub/',href:'https://bondage-europe.com/R131/BondageClub/'},URL,localStorage:{getItem:()=>mode},console:{info(){},error:text=>warnings.push(text)}});
  return {window,document,ctx,nodes,intervals,events,warnings,timeouts};
}
test('official URL scopes reject lookalikes',()=>{
  const include=new RegExp(/^\/\/ @include\s+\/(.*)\/$/m.exec(template)[1]);
  for(const host of ['bondageprojects.elementfx.com','bondageprojects.com','bondage-europe.com','bondageeurope.com','bondage-asia.com']) {
    assert.ok(officialOrigin('https://'+host));
    assert.ok(include.test('https://'+host+'/R132Beta1/BondageClub/'));
  }
  for(const origin of [null,'http://bondage-europe.com','https://bondage-europe.com.evil.example','https://evilbondage-europe.com']) assert.equal(officialOrigin(origin),false);
  assert.equal(include.test('https://bondage-europe.com.evil.example/R131/BondageClub/'),false);
});
test('unconfigured template warns without touching io',()=>{
  const h=harness();const io=()=>{};h.window.io=io;
  vm.runInContext(template,h.ctx);
  assert.equal(h.window.io,io);assert.match(h.warnings[0],/install.user.js/);
  assert.equal(h.document.head.children.length,0);
});
test('early hook works before remote UI loads; all modes preserve server separation',()=>{
  for(const mode of ['native','websocket','relay']) {
    const h=harness(mode);vm.runInContext(code,h.ctx);
    assert.equal(h.document.head.children[0].src,'https://my-relay.pages.dev/runtime.js');
    const calls=[];h.window.io=(...args)=>{calls.push(args);return {on(){}}};
    for(const [host,env] of [['bondage-club-server.herokuapp.com','prod'],['bondage-club-server-test.herokuapp.com','test']]) {
      h.window.io('https://'+host,{timeout:1234});const [url,opts]=calls.at(-1);
      assert.equal(url,mode==='relay'?'https://my-relay.pages.dev':'https://'+host);
      assert.equal(opts.timeout,1234);
      if(mode!=='native')assert.equal(opts.transports[0],'websocket');
      if(mode==='relay')assert.equal(opts.path,`/socket.io/${env}/`);
    }
    h.document.head.children[0].onerror();
    assert.match(h.warnings.at(-1),/面板載入失敗/);
    h.window.io('https://unrelated.example');assert.equal(calls.at(-1)[0],'https://unrelated.example');
  }
});
test('login event removes UI and timers permanently without disconnecting socket',()=>{
  const h=harness();vm.runInContext(code,h.ctx);vm.runInContext(runtime,h.ctx);
  const host=h.document.body.children[0];assert.ok(host);assert.equal(h.intervals.size,1);
  const handlers=new Map();let removed;
  h.window.io=()=>({on:(name,fn)=>handlers.set(name,fn),off:(name,fn)=>{removed=[name,fn]}});
  h.window.io('https://bondage-club-server.herokuapp.com');
  handlers.get('LoginResponse')('InvalidNamePassword');assert.equal(host.removed,false);
  handlers.get('LoginResponse')({MemberNumber:123});
  assert.equal(host.removed,true);assert.equal(h.intervals.size,0);assert.equal(h.events.size,0);
  assert.equal(removed[0],'LoginResponse');
  handlers.get('disconnect')();handlers.get('connect')();
  assert.equal(h.intervals.size,0);
});
test('poll fallback and late runtime both avoid leaving UI after login',()=>{
  const h=harness();vm.runInContext(code,h.ctx);vm.runInContext(runtime,h.ctx);
  h.events.get('pagehide')();assert.equal(h.intervals.size,0);
  h.events.get('pageshow')();assert.equal(h.intervals.size,1);
  h.window.Player={MemberNumber:12};h.intervals.values().next().value();
  assert.ok(h.document.body.children[0].removed);assert.equal(h.intervals.size,0);
  const late=harness();vm.runInContext(code,late.ctx);late.window.__BCRelayLoader.finishLogin();vm.runInContext(runtime,late.ctx);
  assert.equal(late.document.body.children.length,0);assert.equal(late.intervals.size,0);
});
test('installer sets update URLs and relay rejects arbitrary upstreams',async()=>{
  const env={ASSETS:{fetch:async()=>new Response(template)}};
  const res=await worker.fetch(new Request('https://my-relay.pages.dev/install.user.js'),env);
  const installed=await res.text();assert.ok(!installed.includes('__INSTALL_URL__'));assert.ok(!installed.includes('__RELAY_ORIGIN__'));
  assert.match(installed,/@updateURL\s+https:\/\/my-relay.pages.dev\/install.user.js/);
  assert.equal(res.headers.get('Cache-Control'),'no-store');
  assert.equal((await worker.fetch(new Request('https://my-relay.pages.dev/socket.io/prod/',{headers:{Upgrade:'websocket',Origin:'https://evil.example'}}),env)).status,403);
  assert.equal((await worker.fetch(new Request('https://my-relay.pages.dev/socket.io/other/'),env)).status,404);
});

test('panel localizes headings and controls, links help, and follows socket status',()=>{
  for (const [language,connecting,connected,failed,apply] of [
    ['zh-TW','連線中','連線成功','連線失敗','套用'],
    ['zh-CN','連線中','連線成功','連線失敗','套用'],
    ['tw','連線中','連線成功','連線失敗','套用'],
    ['en-US','Connecting','Connected','Connection failed','Apply'],
    ['ru','Connecting','Connected','Connection failed','Apply'],
  ]) {
    const h=harness();h.window.navigator={language};
    vm.runInContext(code,h.ctx);vm.runInContext(runtime,h.ctx);
    const heading=h.nodes.find(n=>n.tag==='strong');
    assert.equal(heading.textContent,`BC RELAY - ${connecting}`);
    assert.equal(h.nodes.find(n=>n.tag==='button' && n.className!=='bubble').textContent,apply);
    const info=h.nodes.find(n=>n.tag==='a');
    assert.equal(info.href,'https://bondageclub-relay.pages.dev/');assert.equal(info.target,'_blank');
    assert.equal(h.nodes.find(n=>n.className==='error').hidden,true);
    const handlers=new Map();h.window.io=()=>({on:(event,fn)=>handlers.set(event,fn)});
    h.window.io('https://bondage-club-server.herokuapp.com');
    handlers.get('connect')();assert.equal(heading.textContent,`BC RELAY - ${connected}`);
    handlers.get('connect_error')();assert.equal(heading.textContent,`BC RELAY - ${failed}`);
    handlers.get('connect')();assert.equal(heading.textContent,`BC RELAY - ${connected}`);
    handlers.get('disconnect')();assert.equal(heading.textContent,`BC RELAY - ${failed}`);
  }
});

test('bubble expands, closes outside, drags without opening, clamps and cleans up',()=>{
  const h=harness();vm.runInContext(code,h.ctx);vm.runInContext(runtime,h.ctx);
  const bubble=h.nodes.find(n=>n.className==='bubble'), panel=h.nodes.find(n=>n.className==='panel');
  const host=h.document.body.children[0], shadow=host.shadow;
  assert.equal(panel.hidden,true);assert.equal(bubble.hidden,false);
  assert.equal(h.nodes.find(n=>n.className==='sprite relay').tag,'span');
  bubble.handlers.get('click')();assert.equal(panel.hidden,false);
  h.events.get('doc:pointerdown')({composedPath:()=>[panel,shadow,host]});assert.equal(panel.hidden,false);
  h.events.get('doc:pointerdown')({composedPath:()=>[]});assert.equal(panel.hidden,true);
  const down={button:0,pointerId:1,clientX:700,clientY:500,composedPath:()=>[bubble,shadow,host]};
  shadow.handlers.get('pointerdown')(down);
  h.events.get('pointermove')({pointerId:1,clientX:600,clientY:400,preventDefault(){}});
  h.events.get('pointerup')({pointerId:1});bubble.handlers.get('click')();
  assert.equal(panel.hidden,true);assert.equal(host.style.right,'112px');assert.equal(host.style.bottom,'112px');
  shadow.handlers.get('pointerdown')(down);h.events.get('pointerup')({pointerId:1});bubble.handlers.get('click')();
  assert.equal(panel.hidden,false);
  h.window.innerWidth=360;h.events.get('resize')();assert.equal(host.style.right,'12px');
  h.window.__BCRelayLoader.finishLogin();assert.equal(h.events.size,0);assert.equal(h.intervals.size,0);
});

test('localized toast expires after 3 seconds, does not restart on polling, and clears on login',()=>{
  for (const language of ['zh-TW','en']) {
    const h=harness();h.window.navigator={language};vm.runInContext(code,h.ctx);vm.runInContext(runtime,h.ctx);
    const toast=h.nodes.find(n=>n.className?.startsWith('toast'));
    const handlers=new Map();h.window.io=()=>({on:(event,fn)=>handlers.set(event,fn)});
    h.window.io('https://bondage-club-server.herokuapp.com');handlers.get('connect')();
    assert.equal(toast.textContent,language==='en'?'Connected. You can now log in to the game.':'連線成功，可正常登入遊戲');
    const [id,timeout]=[...h.timeouts][0];assert.equal(timeout.ms,3000);
    h.intervals.values().next().value();assert.ok(h.timeouts.has(id));
    h.timeouts.delete(id);timeout.fn();assert.equal(toast.hidden,true);
    h.intervals.values().next().value();assert.equal(toast.hidden,true);
    handlers.get('connect_error')();assert.equal(toast.hidden,false);
    h.window.__BCRelayLoader.finishLogin();assert.equal(h.timeouts.size,0);
  }
});

test('one classified status drives error text and toast; repositioning preserves its deadline',()=>{
  const h=harness();h.window.navigator={language:'en'};vm.runInContext(code,h.ctx);vm.runInContext(runtime,h.ctx);
  const host=h.document.body.children[0], toast=h.nodes.find(n=>n.className==='toast');
  const error=h.nodes.find(n=>n.className==='error');
  h.window.ServerSocket={};h.intervals.values().next().value();
  assert.match(error.textContent,/not intercepted/);assert.match(toast.textContent,/not intercepted/);
  const handlers=new Map();h.window.io=()=>({on:(event,fn)=>handlers.set(event,fn)});
  h.window.io('https://bondage-club-server.herokuapp.com');handlers.get('disconnect')();
  assert.match(error.textContent,/disconnected/i);assert.match(toast.textContent,/Disconnected/);
  handlers.get('connect_error')();assert.match(error.textContent,/cause is not available/);
  const deadline=[...h.timeouts.keys()][0];
  host.getBoundingClientRect=()=>({width:60,height:60,left:20,right:80});
  h.events.get('resize')();assert.equal(toast.className,'toast above');assert.ok(h.timeouts.has(deadline));
  handlers.get('connect')();assert.equal(error.hidden,true);assert.equal(error.textContent,'');
});
