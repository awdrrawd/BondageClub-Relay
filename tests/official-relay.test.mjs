import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import worker,{officialOrigin} from '../relay-test/worker.js';
test('official origin allowlist rejects lookalikes and insecure origins',()=>{
 for(const origin of ['https://bondage-europe.com','https://www.bondageprojects.com','https://bondageeurope.com']) assert.equal(officialOrigin(origin),true);
 for(const origin of [null,'http://bondage-europe.com','https://bondage-europe.com.evil.example','https://evilbondage-europe.com','https://bondage-europe.com/path']) assert.equal(officialOrigin(origin),false);
});

test('userscript include and login polling support official pages and release timers',async()=>{
 const code=await readFile(new URL('../relay-test/client.user.js',import.meta.url),'utf8');
 const pattern=/^\/\/ @include\s+\/(.*)\/$/m.exec(code)[1];const include=new RegExp(pattern);
 for(const url of ['https://www.bondageprojects.elementfx.com/R131/BondageClub/','https://bondageprojects.com/R131/BondageClub/','https://bondageeurope.com/R131/BondageClub/','https://bondage-asia.com/club/R132Beta1/BondageClub/'])assert.equal(include.test(url),true,url);
 for(const url of ['http://bondage-europe.com/R131/','https://bondage-europe.com.evil.example/R131/'])assert.equal(include.test(url),false,url);
 const timers=new Map(),events=new Map();let next=0,box;
 const window={setInterval:fn=>{timers.set(++next,fn);return next},clearInterval:id=>timers.delete(id),addEventListener:(name,fn)=>events.set(name,fn)};
 const document={readyState:'complete',createElement:()=>({style:{},append(){}}),body:{append:element=>{box=element}}};
 const messages=[];
 vm.runInNewContext(code.replace('"__RELAY_ORIGIN__"','"https://my-relay.pages.dev"'),{window,document,location:{pathname:'/R131/BondageClub/'},URL,localStorage:{getItem:()=>null},console:{info:(_prefix,_time,text)=>messages.push(text)},confirm:()=>false});
 assert.equal(messages.length,0,'loading alone must not report a missed interception');
 window.ServerSocket={};timers.values().next().value();assert.match(messages.at(-1),/官方 Socket 已建立/);
 assert.equal(box.hidden,false);assert.match(box.style.cssText,/bottom:8px/);assert.equal(timers.size,1);
 window.Player={MemberNumber:55};timers.values().next().value();assert.equal(box.hidden,true);
 window.Player={};timers.values().next().value();assert.equal(box.hidden,false);
 events.get('pagehide')();assert.equal(timers.size,0);
 events.get('pageshow')();events.get('pageshow')();assert.equal(timers.size,1);
});
test('unconfigured repository template warns before touching the official socket factory',async()=>{
 const code=await readFile(new URL('../relay-test/client.user.js',import.meta.url),'utf8');
 const warnings=[];const io=()=>{};const window={io,alert:text=>warnings.push(text)};
 vm.runInNewContext(code,{window,location:{pathname:'/R131/BondageClub/'},console:{error(){}}});
 assert.equal(window.io,io);
 assert.equal(Object.getOwnPropertyDescriptor(window,'io').get,undefined);
 assert.equal(warnings.length,1);assert.match(warnings[0],/install\.user\.js/);
 assert.match(warnings[0],/原版連線/);
});
test('installer embeds its own origin and relay rejects arbitrary upstreams',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('const relay = "__RELAY_ORIGIN__";')}};
 assert.equal(await (await worker.fetch(new Request('https://my-relay.pages.dev/install.user.js'),env)).text(),'const relay = "https://my-relay.pages.dev";');
 assert.equal((await worker.fetch(new Request('https://my-relay.pages.dev/socket.io/prod/',{headers:{Upgrade:'websocket',Origin:'https://evil.example'}}),env)).status,403);
 assert.equal((await worker.fetch(new Request('https://my-relay.pages.dev/socket.io/other/'),env)).status,404);
});
test('document-start hook preserves native mode and separates prod/test without login interception',async()=>{
 const code=(await readFile(new URL('../relay-test/client.user.js',import.meta.url),'utf8')).replace('"__RELAY_ORIGIN__"','"https://my-relay.pages.dev"');
 for(const mode of ['native','websocket','relay']) {
  const window={};const calls=[];
  vm.runInNewContext(code,{window,location:{pathname:'/R131/BondageClub/',href:'https://bondage-europe.com/R131/BondageClub/'},URL,localStorage:{getItem:()=>mode},document:{readyState:'loading',addEventListener(){}},console:{info(){}},confirm:()=>false});
  window.io=(...args)=>{calls.push(args);return {on(){}}};
  for(const [host,env] of [['bondage-club-server.herokuapp.com','prod'],['bondage-club-server-test.herokuapp.com','test']]) {
   window.io('https://'+host,{timeout:1234});const [url,options]=calls.at(-1);
   assert.equal(url,mode==='relay'?'https://my-relay.pages.dev':'https://'+host);
   assert.equal(options.timeout,1234);
   if(mode!=='native')assert.equal(options.transports[0],'websocket');
   if(mode==='relay')assert.equal(options.path,`/socket.io/${env}/`);
  }
  window.io('https://unrelated.example');assert.equal(calls.at(-1)[0],'https://unrelated.example');
 }
});
