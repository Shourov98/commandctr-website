const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),Module=require("node:module"),vm=require("node:vm");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");

function loadComponent(){
 const filename=require.resolve("../app/(dashboard)/products/add/AmazonOfferReferences.tsx");
 const compiled=ts.transpileModule(fs.readFileSync(filename,"utf8"),{compilerOptions:{
   module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2021}}).outputText;
 const mod=new Module(filename);mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(compiled,filename);
 return mod.exports.default;
}
test("Both prices remain visible when all offers are excluded from the recommendation",()=>{
 const html=renderToStaticMarkup(React.createElement(loadComponent(),{pricing:{
   reference_offers:[
     {title:"Notebook",price:3.68,shipping:0,delivered_price:3.68,currency:"GBP",fulfilment:"FBA",my_offer:false,exclusion_reasons:["fulfilment_mismatch"]},
     {title:"Notebook",price:5,shipping:0,delivered_price:5,currency:"GBP",fulfilment:"FBM",my_offer:true,exclusion_reasons:["own_offer"]},
   ],reference_price_range:{minimum:3.68,maximum:3.68,count:1,currency:"GBP",price_basis:"delivered"},
   offer_diagnostics:{returned_count:2,qualifying_count:0,exclusion_counts:{}},
 }}));
 for(const expected of ["£3.68","£5.00","FBA","FBM","Your offer","Different fulfilment method","Other-seller reference total","0","match the recommendation rules"])
   assert(html.includes(expected),expected);
});
test("An empty response says no offers instead of presenting zero as a price",()=>{
 const html=renderToStaticMarkup(React.createElement(loadComponent(),{pricing:{
   reference_offers:[],reference_price_range:null,offer_diagnostics:{returned_count:0,qualifying_count:0,exclusion_counts:{}},
 }}));
 assert(html.includes("Amazon returned no offers"));
 assert(!html.includes("£0.00"));
});
test("Switching products replaces the old description, vendor, price and seller SKU; refresh preserves manual edits",()=>{
 const file=require.resolve("../app/(dashboard)/products/add/AddProductEditor.tsx"),source=fs.readFileSync(file,"utf8");
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let handler;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.getText(ast)==="applyRecord")handler=node.getText(ast);ts.forEachChild(node,visit);}
 visit(ast);
 const code=ts.transpileModule(handler+"\nmodule.exports=applyRecord;",{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const state={publishDescription:"Nike shoe description",publishVendor:"Nike",publishPrice:"50.00",publishSku:"OLD-SHOE",publishStock:"10"};
 let snapshot;
 const ctx={module:{exports:{}},appliedProductIdRef:{current:"old-shoe"},publishPriceRef:{current:"50.00"},
   lastAutoPublishPriceRef:{current:""},lastSavedDraftRef:{current:""},activeMarket:"amazon",
   draft:{amazon:{structured_attributes:{}}},backendProductId:null,ebayListingId:null,ebayListingStatus:null,shopifyProductId:null,
   publishStatus:"DRAFT",publishOnOnlineStore:true,publishTrackInventory:true,...state,
   setProductId:()=>{},setImageRevision:()=>{},setDraft:()=>{},setVariantsByMarket:()=>{},setSourceTitle:()=>{},
   clearPricingSnapshot:()=>{},setDraftSaveState:()=>{},setStatusMessage:()=>{},
   buildComparableDraftSignature:value=>{snapshot=value;return "saved";}};
 for(const key of Object.keys(state)) ctx["set"+key[0].toUpperCase()+key.slice(1)]=value=>state[key]=typeof value==="function"?value(state[key]):value;
 vm.runInNewContext(code,ctx);
 const record={id:"notebook-id",updated_at:"now",variants:{},product:{
   core:{attributes:{brand:"Publisher"},source_title:"Notebook",product_summary:"Core notebook"},
   amazon:{description:"Amazon notebook description"},shopify:{stock_locations:[],variants:[],body_html:"Shopify notebook"},images:{},
 }};
 ctx.module.exports(record,"Loaded");
 assert.equal(state.publishDescription,"Amazon notebook description");
 assert.equal(state.publishVendor,"Publisher");
 assert.equal(state.publishPrice,"");
 assert.equal(state.publishSku,"NOTEBOOK-ID");
 assert.equal(state.publishStock,"0");
 assert.equal(snapshot.publishDescription,"Amazon notebook description");
 assert.equal(snapshot.publishStock,"0");
 Object.assign(state,{publishDescription:"My notebook description",publishPrice:"4.99",publishSku:"MY-NOTEBOOK"});
 Object.assign(ctx,state);
 ctx.module.exports(record,"Refreshed");
 assert.equal(state.publishDescription,"My notebook description");
 assert.equal(state.publishPrice,"4.99");
 assert.equal(state.publishSku,"MY-NOTEBOOK");
});
