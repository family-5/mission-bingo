"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureAnonymousUser } from "../lib/firebase-client";

const missions = ["みんなの笑顔を撮る","500円でお土産","朝の空を撮る","本気で笑わせる","夏の料理を作る","スマホなしで1時間","肩もみをする","初めての店へ","みんなで散歩","家事をひとつ","昔話を聞く","1万歩あるく","新しい遊び","夏の生き物","誰かを褒める","料理を担当","同じポーズ","初めての場所","協力して作る","夕焼けを撮る","飲み物を用意","100均で遊ぶ","豆知識を披露","30分運動","最高の一枚"];
const people = [
  {id:"shingo",name:"しんご",color:"#ff6b5f"},{id:"natsuki",name:"なつき",color:"#18a999"},{id:"taro",name:"太郎",color:"#5577ee"},{id:"hanako",name:"花子",color:"#e45aa6"},{id:"jiro",name:"次郎",color:"#f59e0b"},
];
const lines = [...Array(5)].map((_,r)=>[0,1,2,3,4].map(c=>r*5+c)).concat([...Array(5)].map((_,c)=>[0,1,2,3,4].map(r=>r*5+c)),[[0,6,12,18,24],[4,8,12,16,20]]);
type Comment={id:string;author:string;text:string;at:string};
type Post={id:string;mission:number;person:string;status:"pending"|"approved";approvals:string[];photo:string;caption:string;comments:Comment[]};
const seed:Post[]=[
  {id:"p1",mission:0,person:"shingo",status:"approved",approvals:["natsuki","taro"],photo:"https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80",caption:"全員そろって最高のスタート！",comments:[{id:"c1",author:"花子",text:"この写真ずっと残したい☺️",at:"今日 10:24"}]},
  {id:"p2",mission:19,person:"natsuki",status:"approved",approvals:["shingo","hanako"],photo:"https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=900&q=80",caption:"帰り道の空がすごかった",comments:[]},
  {id:"p3",mission:20,person:"taro",status:"pending",approvals:["shingo"],photo:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",caption:"みんなに麦茶を用意した！",comments:[]},
];

function bingoCount(done:number[]){const s=new Set(done);return lines.filter(l=>l.every(x=>s.has(x))).length}
function initials(name:string){return name.slice(0,1)}

export default function Home(){
  const [tab,setTab]=useState("bingo"); const [me,setMe]=useState("shingo");
  const [connection,setConnection]=useState<"connecting"|"online"|"error">("connecting");
  const [posts,setPosts]=useState<Post[]>(seed); const [selected,setSelected]=useState<Post|null>(null); const [comment,setComment]=useState("");
  useEffect(()=>{const raw=localStorage.getItem("mission-bingo-demo");if(raw)try{setPosts(JSON.parse(raw))}catch{}},[]);
  useEffect(()=>{ensureAnonymousUser().then(()=>setConnection("online")).catch(()=>setConnection("error"))},[]);
  useEffect(()=>{localStorage.setItem("mission-bingo-demo",JSON.stringify(posts))},[posts]);
  const mine=posts.filter(p=>p.person===me&&p.status==="approved"); const done=[...new Set(mine.map(p=>p.mission))];
  const pending=posts.filter(p=>p.status==="pending"&&p.person!==me&&!p.approvals.includes(me));
  const ranking=useMemo(()=>people.map(person=>{const ds=[...new Set(posts.filter(p=>p.person===person.id&&p.status==="approved").map(p=>p.mission))];return{person,done:ds.length,bingo:bingoCount(ds)}}).sort((a,b)=>b.bingo-a.bingo||b.done-a.done),[posts]);
  const addComment=()=>{if(!selected||!comment.trim())return;const c={id:crypto.randomUUID(),author:people.find(p=>p.id===me)!.name,text:comment.trim(),at:"たった今"};setPosts(ps=>ps.map(p=>p.id===selected.id?{...p,comments:[...p.comments,c]}:p));setSelected({...selected,comments:[...selected.comments,c]});setComment("")};
  const approve=(id:string)=>setPosts(ps=>ps.map(p=>{if(p.id!==id)return p;const approvals=[...new Set([...p.approvals,me])];return{...p,approvals,status:approvals.length>=2?"approved":"pending"}}));
  return <main className="shell">
    <header><div className="brand"><span className="logo">M</span><div><small>みんなで集める思い出</small><h1>ミッションビンゴ</h1></div></div><div className="header-actions"><i className={`connection ${connection}`} title={connection==="online"?"Firebase接続済み":connection==="error"?"接続エラー":"接続中"}/><button className="person" style={{"--person":people.find(p=>p.id===me)?.color} as React.CSSProperties} onClick={()=>setTab("settings")}><span>{initials(people.find(p=>p.id===me)!.name)}</span>{people.find(p=>p.id===me)!.name}</button></div></header>
    <section className="hero"><div><span className="eyebrow">SUMMER QUEST 2026</span><h2>夏休み 家族チャレンジ</h2><p>あと一歩の瞬間も、みんなの宝物に。</p></div><div className="hero-stamp"><b>{done.length}</b><span>/ 25</span><small>達成</small></div></section>

    {tab==="bingo"&&<><section className="metrics"><div><span>達成マス</span><b>{done.length}<small>/25</small></b></div><div><span>ビンゴ</span><b>{bingoCount(done)}<small>本</small></b></div><div><span>承認待ち</span><b>{posts.filter(p=>p.person===me&&p.status==="pending").length}<small>件</small></b></div></section><section className="board">{missions.map((m,i)=>{const post=posts.find(p=>p.person===me&&p.mission===i);return <button key={m} className={`cell ${post?.status||""}`} style={post?.status==="approved"?{"--fill":people.find(p=>p.id===me)?.color} as React.CSSProperties:{}} onClick={()=>post&&setSelected(post)}><span className="number">{String(i+1).padStart(2,"0")}</span><span>{m}</span>{post?.status==="approved"&&<i>✓</i>}{post?.status==="pending"&&<i>…</i>}</button>})}</section><p className="board-note">マスをタップして申請や思い出を確認できます</p></>}

    {tab==="all"&&<section className="page"><div className="section-title"><div><small>TEAM PROGRESS</small><h2>みんなの進み具合</h2></div></div>{people.map(p=>{const ds=[...new Set(posts.filter(x=>x.person===p.id&&x.status==="approved").map(x=>x.mission))];return <article className="progress-card" key={p.id}><span className="avatar" style={{background:p.color}}>{initials(p.name)}</span><div><b>{p.name}</b><div className="bar"><i style={{width:`${ds.length*4}%`,background:p.color}}/></div></div><strong>{ds.length}<small>/25</small></strong></article>})}</section>}

    {tab==="approve"&&<section className="page"><div className="section-title"><div><small>HIGH FIVE!</small><h2>承認を待っています</h2></div><span className="count">{pending.length}件</span></div>{pending.length===0?<div className="empty">🎉<b>すべて確認済み！</b><span>次の挑戦を応援しよう</span></div>:pending.map(post=>{const p=people.find(x=>x.id===post.person)!;return <article className="post-card" key={post.id}><img src={post.photo} alt="証拠写真"/><div className="post-copy"><small>{missions[post.mission]}</small><h3><i style={{background:p.color}}/>{p.name}のチャレンジ</h3><p>「{post.caption}」</p><div className="approval-row"><span>{post.approvals.length}/2人が承認</span><button onClick={()=>approve(post.id)}>いいね、達成！</button></div></div></article>})}</section>}

    {tab==="album"&&<section className="page"><div className="section-title"><div><small>OUR MEMORIES</small><h2>思い出アルバム</h2></div></div><div className="album">{posts.filter(p=>p.status==="approved").map(post=>{const p=people.find(x=>x.id===post.person)!;return <button className="memory" key={post.id} onClick={()=>setSelected(post)}><img src={post.photo} alt="思い出"/><div><span style={{color:p.color}}>● {p.name}</span><b>{missions[post.mission]}</b><small>💬 {post.comments.length}件のコメント</small></div></button>})}</div></section>}

    {tab==="rank"&&<section className="page"><div className="section-title"><div><small>FAMILY LEAGUE</small><h2>ランキング</h2></div></div><div className="ranking">{ranking.map((r,i)=><article key={r.person.id} className={i===0?"winner":""}><em>{i+1}</em><span className="avatar" style={{background:r.person.color}}>{initials(r.person.name)}</span><b>{r.person.name}</b><div><strong>{r.bingo} BINGO</strong><small>{r.done}マス達成</small></div></article>)}</div></section>}

    {tab==="settings"&&<section className="page"><div className="section-title"><div><small>WHO ARE YOU?</small><h2>使う人を選ぶ</h2></div></div><div className="people-grid">{people.map(p=><button key={p.id} className={me===p.id?"active":""} onClick={()=>{setMe(p.id);setTab("bingo")}}><span style={{background:p.color}}>{initials(p.name)}</span><b>{p.name}</b>{me===p.id&&<i>選択中</i>}</button>)}</div><article className="settings-card"><span>🔗</span><div><b>家族をゲームに招待</b><small>共有URLをLINEなどで送れます</small></div><button>コピー</button></article><article className="settings-card"><span>🔒</span><div><b>ゲーム設定</b><small>作成者PINで編集できます</small></div><button>開く</button></article></section>}

    <nav>{[["bingo","▦","ビンゴ"],["all","◎","みんな"],["approve","✓","承認"],["album","▣","アルバム"],["rank","♛","順位"]].map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><i>{icon}</i><span>{label}</span>{id==="approve"&&pending.length>0&&<b>{pending.length}</b>}</button>)}</nav>

    {selected&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><article className="modal"><button className="close" onClick={()=>setSelected(null)}>×</button><img className="modal-photo" src={selected.photo} alt="投稿写真"/><div className="modal-body"><span className="mission-label">MISSION {String(selected.mission+1).padStart(2,"0")}</span><h2>{missions[selected.mission]}</h2><p className="caption">「{selected.caption}」</p><h3>写真へのコメント <small>{selected.comments.length}</small></h3><div className="comments">{selected.comments.length===0?<p className="no-comment">最初のコメントを残そう！</p>:selected.comments.map(c=><div key={c.id}><span>{initials(c.author)}</span><p><b>{c.author}</b>{c.text}<small>{c.at}</small></p></div>)}</div><div className="comment-form"><input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment()} placeholder="写真にコメントする…" maxLength={120}/><button onClick={addComment} disabled={!comment.trim()}>送信</button></div></div></article></div>}
  </main>
}
