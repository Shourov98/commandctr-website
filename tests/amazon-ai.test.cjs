const {test} = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const source = fs.readFileSync(require.resolve("../lib/amazon-ai.ts"),"utf8");
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod = new Module(__filename);
mod._compile(js,__filename);
const {amazonComparisonOptions,canApplyAmazonPrice,productImageUrl} = mod.exports;

test("real variant constraints go to GBP pricing; an internal seller SKU is insufficient",()=>{
  assert.throws(()=>amazonComparisonOptions({sku:"INTERNAL-123"},{}, "new_new"),/real model/);
  const options = amazonComparisonOptions({model_number:"WH-1000XM5",size:"10",size_system:"UK"},
    {manufacturer_part_number:'[{"value":"ABC-123"}]'}, "new_new");
  assert.equal(options.country,"GB");
  assert.equal(options.currency,"GBP");
  assert.equal(options.sku,"ABC-123");
  assert.equal(options.size_system,"UK");
  assert.throws(()=>amazonComparisonOptions({model_number:"ABC",size:"10"},{}, "new_new"),/size system/);
});
test("USD, heuristics, insufficient evidence and invalid prices cannot enter a GBP offer",()=>{
  const valid={marketplace:"amazon",currency:"GBP",source_mode:"amazon_sp_api",comparable_count:2,
    recommendation_basis:"active_asking",recommended_price:25};
  assert.equal(canApplyAmazonPrice(valid),true);
  for (const change of [{currency:"USD"},{source_mode:"heuristic"},{comparable_count:1},
                       {recommended_price:NaN},{recommended_price:-1},{recommendation_basis:"insufficient_data"}])
    assert.equal(canApplyAmazonPrice({...valid,...change}),false);
});
test("backend-local image previews use the authenticated product proxy",()=>{
  assert.equal(productImageUrl("/tmp/run/amazon.png","id-1"),"/api/product-ai/products/id-1/image?path=%2Ftmp%2Frun%2Famazon.png");
  assert.match(productImageUrl("https://bucket.s3.amazonaws.com/a.png","id-1"),/image\?url=/);
});
