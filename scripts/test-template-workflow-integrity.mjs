/** Existing templates must not be overwritten by document JSON; committed saves are final. */
import assert from 'node:assert/strict';
import {installFakeIndexedDB} from './test-support/fake-indexeddb.mjs';
installFakeIndexedDB();
const {getTemplate,putTemplate,addTemplate}=await import('../document_builder/dist/template-db.js');
const {createTemplateWorkflow}=await import('../document_builder/dist/templates/template-workflow.js');
const layout={topLeft:'',topRight:'',opening:'',body:'',closing:'',end:''};
const original={id:'template-test',name:'現在の設定',fields:[{id:'name',label:'名前',type:'text'}],document:layout};
const outdated={...original,name:'過去の設定'};
await putTemplate(original);
await assert.rejects(addTemplate({...original,name:'collision'}), /同じID/);
assert.equal((await getTemplate(original.id)).name,'現在の設定');
const toFile=payload=>new File([JSON.stringify(payload)],'document.json',{type:'application/json'});
const importedFile=toFile({version:1,template:outdated,values:{name:'過去の入力値'}});
const documentInput={files:[importedFile],value:'document.json'};
const templateInput={files:null,value:''};
let selected=null, toast='';
let refreshShouldFail=false;
const deps={jsonImportInput:documentInput,templateAddInput:templateInput,templateSelect:{value:''},
  activeTemplate:null,activeValues:{},
  refreshTemplateCollections:async()=>{if(refreshShouldFail)throw Error('UI refresh failed');},
  applyTemplate:(template,values)=>{selected={template,values};},
  clearActiveTemplate:()=>{},showToast:message=>{toast=message;},getErrorMessage:e=>e.message};
const workflow=createTemplateWorkflow(deps);
await workflow.handleDocumentImport();
assert.equal((await getTemplate(original.id)).name,'現在の設定');
assert.equal(selected.template.name,'現在の設定');
assert.equal(selected.values.name,'過去の入力値');
assert.match(toast,/変更していません/);
refreshShouldFail=true;
const newTemplate={...original,id:'created',name:'新しいテンプレート'};
const originalLog=console.error;console.error=()=>{};
try {
 await workflow.saveTemplateFromBuilder(newTemplate,'create');
 assert.equal((await getTemplate('created')).name,'新しいテンプレート');
 assert.match(toast,/保存は完了.*画面を更新できません/);
 // A second attempt cannot silently overwrite a committed create.
 await assert.rejects(workflow.saveTemplateFromBuilder({...newTemplate,name:'retry'},'create'),/すでに存在/);
 await workflow.saveTemplateFromBuilder({...newTemplate,name:'更新済み'},'edit');
 assert.equal((await getTemplate('created')).name,'更新済み');
 assert.match(toast,/保存は完了/);
} finally {console.error=originalLog;}
console.log('PASS: document import preserves current template, committed template saves survive UI failures');
