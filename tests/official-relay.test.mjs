import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import worker,{officialOrigin} from '../relay-test/worker.js';
test('official origin allowlist rejects lookalikes and insecure origins',()=>{
 for(const origin of ['https://bondage-europe.com','https://www.bondageprojects.com']) assert.equal(officialOrigin(origin),true);
 for(const origin of [null,'http://bondage-europe.com','https://bondage-europe.com.evil.example','https://evilbondage-europe.com','https://bondage-europe.com/path']) assert.equal(officialOrigin(origin),false);
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
