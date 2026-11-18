import assert from 'node:assert/strict';
import { renderPrintHistoryEntries } from '../document_builder/dist/history/print-history-view.js';
class FakeElement {
  constructor(tag) {this.tag=tag;this.children=[];this.parent=null;this.events=new Map();this.textContent='';this.open=true;this.disabled=false;}
  append(...children) {for(const x of children){x.parent=this;this.children.push(x);}}
  appendChild(x) {this.append(x);}
  setAttribute(){}
  addEventListener(event,listener){this.events.set(event,listener);}
  remove(){if(this.parent) this.parent.children=this.parent.children.filter(x=>x!==this);}
  click(){this.events.get('click')?.();}
}
globalThis.document={createElement: tag=>new FakeElement(tag)};
globalThis.window={confirm:()=>true};
const waitFor=async p=>{for(let i=0;i<200;i++){if(p())return;await new Promise(r=>setTimeout(r,5));}throw Error('timeout')};
const list=new FakeElement('ul');
const statuses=[];
renderPrintHistoryEntries(list,[{id:'id-1',fileName:'saved.pdf',createdAt:1,pdfBytes:100}],{
  downloadHistoryPdf:async()=>{},deletePrintHistory:async()=>{},showToast:m=>statuses.push(m),
  printHistoryDialog:{open:true},openPrintHistory:async()=>{throw Error('refresh fails')},
  getErrorMessage:e=>String(e),formatPrintHistoryBytes:()=> '100B',formatPrintHistoryDate:()=> 'today'
});
const item=list.children[0];
const buttons=item.children.flatMap(x=>x.children).filter(x=>x.tag==='button');
assert.equal(buttons.length,2);
const expectedErrors=[];
const originalConsoleError=console.error;
console.error=(...parts)=>expectedErrors.push(parts);
try {
  buttons[1].click();
  await waitFor(()=>statuses.length>0);
} finally {
  console.error=originalConsoleError;
}
assert.ok(expectedErrors.length>0, 'refresh failure should be logged');
assert.match(statuses.at(-1), /削除済み/);
assert.ok(!statuses.at(-1).includes('削除できません'));
assert.equal(list.children.length,0);
console.log('PASS: history delete remains successful even when list refresh rejects');
