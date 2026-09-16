import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const code=await readFile(new URL('../src/monitor/monitor.js',import.meta.url),'utf8');
const html=await readFile(new URL('../src/monitor/index.html',import.meta.url),'utf8');
async function render(data){
  function element(tagName){
    return {tagName,children:[],dataset:{},attrs:{},events:{},textContent:'',classList:{toggle(){}},
      append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},
      setAttribute(k,v){this.attrs[k]=v;if(k==='data-hour')this.dataset.hour=v},getAttribute(k){return this.attrs[k]},
      addEventListener(k,fn){this.events[k]=fn},focus(){}};
  }
  const ids=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element('div')]));
  const tabs=['overview','history','errors','performance'].map(view=>{const el=ids['tab-'+view];el.dataset.view=view;return el});
  const walk=el=>[el,...el.children.flatMap(walk)];
  const document={hidden:false,documentElement:{},getElementById:id=>ids[id],createElement:element,createElementNS:(_,tag)=>element(tag),addEventListener(){},
    querySelectorAll:selector=>selector==='[data-view]'?tabs:Object.values(ids).flatMap(walk).filter(el=>el.dataset.hour)};
  vm.runInNewContext(code,{document,navigator:{language:'zh-TW'},Intl,Date,AbortSignal,setTimeout(){},setInterval(){},fetch:async()=>({ok:true,json:async()=>data})});
  await new Promise(resolve=>setImmediate(resolve));
  return {ids,tabs,walk};
}
const hours=[{hour:'2026-09-15T10:00:00Z',requests:20,errors:5},{hour:'2026-09-15T12:00:00Z',requests:0,errors:0},{hour:'2026-09-15T11:00:00Z',requests:10,errors:null}];
const data={state:'ready',requests:30,errors:5,hours,from:'2026-09-14T12:30:00Z',to:'2026-09-15T12:30:00Z'};

test('hourly rows are newest first; bar click and keyboard show exact metrics, including zero and unknown',async()=>{
  const {ids,walk}=await render(data);
  assert.deepEqual(Array.from(ids.rows.children,row=>row.dataset.hour),[hours[1].hour,hours[2].hour,hours[0].hour]);
  const targets=walk(ids.chart).filter(el=>el.attrs.role==='button');
  assert.equal(targets.length,3);
  targets[0].events.click();
  assert.match(ids['hour-detail'].children[1].textContent,/20.*5.*25%/);
  assert.equal(targets[0].attrs['aria-pressed'],'true');
  let prevented=false;
  targets[2].events.keydown({key:'Enter',preventDefault(){prevented=true}});
  assert.ok(prevented);
  assert.match(ids['hour-detail'].children[0].textContent,/12:30/);
  assert.match(ids['hour-detail'].children[1].textContent,/0.*0.*—/);
  assert.ok(targets[2].attrs.height>0);
  ids.rows.children[1].children[0].children[0].events.click();
  assert.match(ids['hour-detail'].children[1].textContent,/10.*—.*—/);
});

test('selection survives language and view changes; unavailable data leaves no stale details',async()=>{
  const {ids,tabs,walk}=await render(data);
  walk(ids.chart).find(el=>el.attrs.role==='button').events.click();
  ids.language.events.click();
  assert.match(ids['hour-detail'].children[1].textContent,/Requests: 20/);
  tabs[2].events.click();
  assert.match(ids.chartTitle.textContent,/Invocation errors/);
  assert.match(ids['hour-detail'].children[1].textContent,/Requests: 20/);
  for(const state of ['unavailable','no_data','disabled']){
    const result=await render({state,hours:[]});
    assert.equal(result.ids['hour-detail'].children.length,0);
    assert.equal(result.ids.rows.children.length,0);
  }
});
