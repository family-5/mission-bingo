import test from "node:test";
import assert from "node:assert/strict";
import { decideCelebration } from "../lib/celebration.ts";

test("通常達成では演出を返さない",()=>assert.equal(decideCelebration([], [0]), null));

test("再同期で達成数が変わらなければ再演出しない",()=>assert.equal(decideCelebration([0,1,2], [0,1,2]), null));

test("残り5のカウントダウン",()=>{
  const current=[...Array(25).keys()].filter(i=>![0,6,12,18,24].includes(i));
  const previous=current.filter(i=>i!==1);
  const effect=decideCelebration(previous,current);
  assert.equal(effect?.kind,"countdown"); assert.equal(effect?.title,"あと5個！");
});

for (const [remaining,missing] of [[4,[0,6,12,18]],[3,[0,6,12]],[2,[0,6]]]) {
  test(`残り${remaining}のカウントダウン`,()=>{
    const current=[...Array(25).keys()].filter(i=>!missing.includes(i));
    const previous=current.filter(i=>i!==1);
    const effect=decideCelebration(previous,current);
    assert.equal(effect?.kind,"countdown"); assert.match(effect?.title??"",new RegExp(`あと${remaining}個`));
  });
}

test("新規BINGO",()=>{
  const effect=decideCelebration([0,1,2,3],[0,1,2,3,4]);
  assert.equal(effect?.kind,"bingo"); assert.equal(effect?.title,"BINGO!!"); assert.deepEqual(effect?.lineIndices,[0]);
});

test("同じ1マスでDOUBLE BINGO",()=>{
  const previous=[1,2,3,4,5,10,15,20];
  const effect=decideCelebration(previous,[...previous,0]);
  assert.equal(effect?.kind,"bingo"); assert.equal(effect?.title,"DOUBLE BINGO!!"); assert.equal(effect?.lineIndices.length,2);
});

test("同じ1マスでTRIPLE BINGO",()=>{
  const previous=[1,2,3,4,5,10,15,20,6,12,18,24];
  const effect=decideCelebration(previous,[...previous,0]);
  assert.equal(effect?.kind,"bingo"); assert.equal(effect?.title,"TRIPLE BINGO!!"); assert.equal(effect?.lineIndices.length,3);
});

test("残り1はBINGO優先でもLAST MISSIONを含む",()=>{
  const previous=[...Array(25).keys()].filter(i=>![0,6].includes(i));
  const current=[...previous,6];
  const effect=decideCelebration(previous,current);
  assert.equal(effect?.kind,"bingo"); assert.match(effect?.subtitle??"",/LAST MISSION/);
});

test("25個目はBINGOよりCOMPLETEを優先",()=>{
  const previous=[...Array(24).keys()];
  const current=[...Array(25).keys()];
  const effect=decideCelebration(previous,current);
  assert.equal(effect?.kind,"complete"); assert.equal(effect?.title,"MISSION COMPLETE!!");
});
