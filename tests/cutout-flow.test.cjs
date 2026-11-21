const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
const source=fs.readFileSync(require.resolve("../app/(dashboard)/products/add/AddProductEditor.tsx"),"utf8");
const ast=ts.createSourceFile("editor.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if(ts.isFunctionDeclaration(node)&&node.name?.getText(ast)==="uploadProductSourceImage") handler=node.getText(ast);
  ts.forEachChild(node,visit);
}
visit(ast);
assert(handler);
const compiled=ts.transpileModule(handler+"\nmodule.exports=uploadProductSourceImage;",
  {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;

function runHandler(overrides={}) {
  const events={requests:[],messages:[],busy:[],cleared:false,record:null,title:null};
  const record={id:"new-draft",product:{images:{transparent_cutout:{
    absolute_path:"/tmp/run/cutout.png",validation:{passed:true}}}}};
  const context={
    module:{exports:{}},FormData,File,Error,
    isImportMode:false,productId:null,sourceTitle:"",draft:{images:{source:{absolute_path:"",relative_path:""}}},
    selectedImage:new File(["source"],"shoe.png",{type:"image/png"}),
    setIsUploadingSourceImage:value=>events.busy.push(value),
    setStatusMessage:message=>events.messages.push(message),
    setSourceTitle:title=>events.title=title,
    clearSelectedImageSelection:()=>events.cleared=true,
    applyRecord:(value,message)=>{events.record=value;events.messages.push(message);},
    fetchSourceImageAsFile:async()=>null,
    fetch:async(url,request)=>{
      events.requests.push({url,request});
      return {ok:true,json:async()=>record};
    },
    ...overrides,
  };
  vm.runInNewContext(compiled,context);
  return {events,context,run:()=>context.module.exports()};
}
test("Create Cutout posts the selected image without a draft or title",async()=>{
  const {events,run}=runHandler();await run();
  assert.equal(events.requests.length,1);
  assert.equal(events.requests[0].url,"/api/product-ai/products/cutout");
  assert.equal(events.requests[0].request.body.get("image").name,"shoe.png");
  assert.equal(events.requests[0].request.body.has("title"),false);
  assert.equal(events.record.id,"new-draft");
  assert.equal(events.cleared,true);
  assert.equal(events.title,"");
  assert.deepEqual(events.busy,[true,false]);
});
test("Regenerate Cutout reuses the saved source after the file picker was cleared",async()=>{
  let loaded;
  const {events,run}=runHandler({
    selectedImage:null,productId:"saved-draft",
    draft:{images:{source:{absolute_path:"/tmp/run/source.png"}}},
    fetchSourceImageAsFile:async(...args)=>{loaded=args;return new File(["saved"],"source.png");},
  });
  await run();
  assert.equal(loaded[3],"saved-draft");
  assert.equal(events.requests[0].url,"/api/product-ai/products/saved-draft/source-image");
});
test("An invalid cutout is reported as failure and leaves the selected image available",async()=>{
  const {events,run}=runHandler({fetch:async()=>({ok:true,json:async()=>({
    id:"saved-source",product:{images:{transparent_cutout:{absolute_path:"",validation:{passed:false,errors:["OpenAI API credits are exhausted."]}}}},
  })})});
  await run();
  assert.equal(events.record.id,"saved-source");
  assert(events.messages.some(message=>message.includes("OpenAI API credits are exhausted.")));
  assert.equal(events.cleared,false);
});
test("Provider errors stay visible and loading always ends",async()=>{
  const {events,run}=runHandler({fetch:async()=>({ok:false,json:async()=>({detail:"Image provider rejected the request."})})});
  await run();
  assert.equal(events.messages.at(-1),"Image provider rejected the request.");
  assert.deepEqual(events.busy,[true,false]);
});
