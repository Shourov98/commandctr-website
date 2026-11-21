const {test}=require("node:test");
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ts=require("typescript"),Module=require("node:module");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");

test("ASIN mode can display the distinct Amazon response fields",()=>{
 const filename=require.resolve("../app/(dashboard)/products/add/AmazonDraftPreview.tsx");
 const source=fs.readFileSync(filename,"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod=new Module(filename);mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(code,filename);
 const html=renderToStaticMarkup(React.createElement(mod.exports.default,{amazon:{
   title:"Amazon-specific watch title",bullet_points:["Amazon feature one","Amazon feature two"],
   description:"Amazon-specific watch description",backend_search_terms:["watch search phrase"],
   structured_attributes:{model:"Watch 3"},
 }}));
 for(const value of ["Amazon-specific watch title","Amazon feature one","Amazon-specific watch description","watch search phrase","Watch 3"])
   assert(html.includes(value),value);
 assert(html.includes("Existing-ASIN offers use Amazon"));
 assert(/readonly/i.test(html));
});
test("Applying an authoritative record clears old image paths instead of showing a stale Ready badge",()=>{
 const filename=require.resolve("../app/(dashboard)/products/add/AddProductEditor.tsx"),source=fs.readFileSync(filename,"utf8");
 const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.getText(ast)==="applyRecord")handler=node.getText(ast);ts.forEachChild(node,visit);}
 visit(ast);assert(handler);
 const compiled=ts.transpileModule(handler+"\nmodule.exports=applyRecord;",{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 let applied,revision;
 const stop=new Error("captured draft");
 const context={module:{exports:{}},appliedProductIdRef:{current:"old-product"},draft:{images:{amazon:{absolute_path:"/tmp/old/amazon.png",validation:{passed:true}}}},
   setProductId:()=>{},setImageRevision:value=>revision=value,
   setDraft:update=>{applied=update({amazon:{structured_attributes:{}}});throw stop;}};
 vm.runInNewContext(compiled,context);
 const images={amazon:{absolute_path:"",validation:{passed:false}}};
 assert.throws(()=>context.module.exports({id:"current",updated_at:"revision-2",
   product:{images,shopify:{stock_locations:[],variants:[]}}},"Loaded"),error=>error===stop);
 assert.equal(applied.images.amazon.absolute_path,"");
 assert.equal(applied.images.amazon.validation.passed,false);
 assert.equal(revision,"revision-2");
});
