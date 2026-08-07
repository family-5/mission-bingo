"use client";

import { useEffect, useRef, useState } from "react";
import { ensureAnonymousUser, auth } from "../lib/firebase-client";
import { compressEvidencePhoto } from "../lib/image";
import {
  addPhotoComment, approveMission, createGame, photoBytesToUrl,
  subscribeComments, subscribeGame, subscribeSubmissions, submitMission, updateGame,
  type Game, type PhotoComment, type Submission,
} from "../lib/game-service";
import { BINGO_LINES, bingoCount, decideCelebration, type Celebration } from "../lib/celebration";

const DEFAULT_MISSIONS = [
  "家族全員の笑顔写真を撮る","500円以内でお土産を買う","早起きして朝の空を撮る","誰かを本気で笑わせる","季節の料理を作る",
  "1時間スマホなしで過ごす","家族の誰かを肩もみする","初めてのお店に入る","みんなで散歩する","言われずに家事を終える",
  "家族の昔話を聞く","1万歩を達成する","みんなで新しい遊びをする","季節の生き物を撮る","誰かの素敵な所を投稿する",
  "料理を一品担当する","全員で同じポーズを撮る","行ったことのない場所へ行く","協力して何かを作る","夕焼けをきれいに撮る",
  "家族に飲み物を用意する","100円グッズで遊びを考える","知らない豆知識を披露する","30分以上運動する","最高の一枚を撮る",
];
const COLORS=["#ff6b5f","#18a999","#5577ee","#e45aa6","#f59e0b","#8b5cf6","#0ea5e9","#84a444"];
const initial=(name:string)=>name.slice(0,1);
const localDateTime=(date:Date)=>{const offset=date.getTimezoneOffset()*60000;return new Date(date.getTime()-offset).toISOString().slice(0,16)};
const defaultStart=()=>localDateTime(new Date());
const defaultEnd=()=>localDateTime(new Date(Date.now()+7*24*60*60*1000));

function CreateScreen({onCreated}:{onCreated:(id:string)=>void}){
  const [title,setTitle]=useState("わが家のミッションビンゴ");
  const [names,setNames]=useState(["参加者1","参加者2","参加者3"]);
  const [missions,setMissions]=useState(DEFAULT_MISSIONS);
  const [approvals,setApprovals]=useState(1); const [startsAt,setStartsAt]=useState(defaultStart); const [endsAt,setEndsAt]=useState(defaultEnd);
  const [draftReady,setDraftReady]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{try{const raw=localStorage.getItem("mission-bingo-create-draft");if(raw){const d=JSON.parse(raw);if(d.title)setTitle(d.title);if(Array.isArray(d.names))setNames(d.names);if(Array.isArray(d.missions)&&d.missions.length===25)setMissions(d.missions);if(d.approvals)setApprovals(d.approvals);if(d.startsAt)setStartsAt(d.startsAt);if(d.endsAt)setEndsAt(d.endsAt)}}catch{}finally{setDraftReady(true)}},[]);
  useEffect(()=>{if(draftReady)localStorage.setItem("mission-bingo-create-draft",JSON.stringify({title,names,missions,approvals,startsAt,endsAt}))},[draftReady,title,names,missions,approvals,startsAt,endsAt]);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{
    if(new Date(endsAt).getTime()<=new Date(startsAt).getTime())throw new Error("終了日時は開始日時より後にしてください");
    const participants=names.map((name,i)=>({id:`p${i+1}`,name:name.trim(),color:COLORS[i]}));
    const id=await createGame({title:title.trim(),participants,approvalsRequired:approvals,startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString(),missions:missions.map((text,id)=>({id,text:text.trim()}))});
    localStorage.removeItem("mission-bingo-create-draft");
    onCreated(id);
  }catch(e){setError(e instanceof Error?e.message:"作成に失敗しました")}finally{setBusy(false)}}
  return <main className="shell"><header><div className="brand"><span className="logo">M</span><div><small>みんなで集める思い出</small><h1>ミッションビンゴ</h1></div></div></header>
    <section className="create-page"><span className="eyebrow dark">NEW FAMILY QUEST</span><h2>新しいビンゴを作る</h2><p>作成後に表示されるURLを家族や友だちへ送るだけです。</p>
      <form onSubmit={submit} className="create-form"><label>ゲーム名<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required/></label>
        <div className="form-heading"><b>参加者</b><small>2〜8人</small></div>{names.map((n,i)=><div className="name-row" key={i}><i style={{background:COLORS[i]}}/><input value={n} onChange={e=>setNames(x=>x.map((v,j)=>j===i?e.target.value:v))} required maxLength={16}/>{names.length>2&&<button type="button" onClick={()=>setNames(x=>x.filter((_,j)=>j!==i))}>×</button>}</div>)}
        {names.length<8&&<button type="button" className="secondary" onClick={()=>setNames(x=>[...x,`参加者${x.length+1}`])}>＋ 参加者を追加</button>}
        <label>必要な承認人数<select value={approvals} onChange={e=>setApprovals(Number(e.target.value))}>{Array.from({length:Math.max(1,names.length-1)},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>
        <div className="period-fields"><label>開始日時<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></label><label>終了日時<input type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} required/></label></div>
        <p className="draft-note">入力内容はこの端末へ自動保存されます</p>
        <div className="form-heading"><b>25個のミッション</b><button type="button" onClick={()=>setMissions(DEFAULT_MISSIONS)}>初期値に戻す</button></div><div className="mission-editor">{missions.map((m,i)=><label key={i}><span>{i+1}</span><input value={m} onChange={e=>setMissions(x=>x.map((v,j)=>j===i?e.target.value:v))} required/></label>)}</div>
        {error&&<p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy?"作成中…":"ゲームを作成して共有URLを発行"}</button>
      </form></section></main>
}

function CelebrationOverlay({effect,color,name,onClose}:{effect:Celebration;color:string;name:string;onClose:()=>void}){
  const particleCount=effect.kind==="complete"?48:effect.kind==="bingo"?32:12+effect.intensity*4;
  return <div className={`celebration celebration-${effect.kind} intensity-${effect.intensity}`} style={{"--celebration":color} as React.CSSProperties} onClick={onClose} role="status" aria-live="assertive">
    <div className="particles" aria-hidden="true">{Array.from({length:particleCount},(_,i)=><i key={i} style={{"--i":i,"--x":`${(i*47)%100}%`,"--dx":`${(i%7-3)*14}px`,"--delay":`${(i%9)*-0.09}s`,"--spin":`${(i%2?1:-1)*(120+i*19)}deg`} as React.CSSProperties}/>)}</div>
    <div className="celebration-copy"><small>{effect.kind==="complete"?"FINAL MISSION CLEAR":effect.kind==="bingo"?"NEW LINE COMPLETE":"COMPLETE COUNTDOWN"}</small><strong>{effect.title}</strong>{effect.kind==="complete"&&<b>{name}</b>}<span>{effect.subtitle}</span>{effect.kind==="complete"&&<p>最高！全部のミッションを達成しました！</p>}</div>
    {effect.kind==="complete"&&<button type="button">タップで閉じる</button>}
  </div>
}

function GameApp({gameId}:{gameId:string}){
  const [game,setGame]=useState<Game|null>(null); const [posts,setPosts]=useState<Submission[]>([]);
  const [me,setMe]=useState(""); const [tab,setTab]=useState("bingo"); const [selected,setSelected]=useState<Submission|null>(null);
  const [comments,setComments]=useState<PhotoComment[]>([]); const [comment,setComment]=useState(""); const [error,setError]=useState("");
  const [missionToSubmit,setMissionToSubmit]=useState<number|null>(null); const [busy,setBusy]=useState(false);
  const [shareMessage,setShareMessage]=useState("");
  const [syncKey,setSyncKey]=useState(0); const [lastSync,setLastSync]=useState<Date|null>(null); const [confirmedPosts,setConfirmedPosts]=useState<Submission[]|null>(null);
  const [now,setNow]=useState(Date.now());
  const [editStart,setEditStart]=useState(""); const [editEnd,setEditEnd]=useState(""); const [periodMessage,setPeriodMessage]=useState("");
  const [editAnnouncement,setEditAnnouncement]=useState(""); const [announcementMessage,setAnnouncementMessage]=useState("");
  const [celebration,setCelebration]=useState<Celebration|null>(null); const celebrationKey=useRef(""); const previousDone=useRef<number[]>([]);
  useEffect(()=>subscribeGame(gameId,value=>{setGame(value);setLastSync(new Date())}),[gameId,syncKey]);
  useEffect(()=>subscribeSubmissions(gameId,(value,fromCache)=>{setPosts(value);setLastSync(new Date());if(!fromCache)setConfirmedPosts(value)}),[gameId,syncKey]);
  useEffect(()=>{const reconnect=()=>{if(document.visibilityState==="visible")setSyncKey(v=>v+1)};const pageShow=()=>setSyncKey(v=>v+1);document.addEventListener("visibilitychange",reconnect);window.addEventListener("focus",reconnect);window.addEventListener("online",reconnect);window.addEventListener("pageshow",pageShow);return()=>{document.removeEventListener("visibilitychange",reconnect);window.removeEventListener("focus",reconnect);window.removeEventListener("online",reconnect);window.removeEventListener("pageshow",pageShow)}},[]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{const saved=localStorage.getItem(`mission-bingo-user-${gameId}`);if(saved)setMe(saved)},[gameId]);
  useEffect(()=>{if(game){setEditStart(game.startsAt?localDateTime(new Date(game.startsAt)):defaultStart());setEditEnd(game.endsAt?localDateTime(new Date(game.endsAt)):defaultEnd());setEditAnnouncement(game.announcement??"")}},[game]);
  useEffect(()=>selected?subscribeComments(gameId,selected.id,setComments):undefined,[gameId,selected]);
  useEffect(()=>{if(selected){const fresh=posts.find(p=>p.id===selected.id);if(fresh)setSelected(fresh)}},[posts,selected]);
  useEffect(()=>{if(!confirmedPosts||!me||!game)return;const key=`${gameId}:${me}`;const current=[...new Set(confirmedPosts.filter(p=>p.participantId===me&&p.status==="approved").map(p=>p.missionId))].sort((a,b)=>a-b);if(celebrationKey.current!==key){celebrationKey.current=key;previousDone.current=current;localStorage.setItem(`mission-bingo-seen-${key}`,JSON.stringify(current));return}const effect=decideCelebration(previousDone.current,current);previousDone.current=current;localStorage.setItem(`mission-bingo-seen-${key}`,JSON.stringify(current));if(effect){setTab("bingo");setCelebration(effect)}},[confirmedPosts,me,game,gameId]);
  useEffect(()=>{if(!celebration)return;const timer=setTimeout(()=>setCelebration(null),celebration.duration);return()=>clearTimeout(timer)},[celebration]);
  if(!game)return <main className="shell"><div className="loading">ゲームを読み込んでいます…</div></main>;
  const people=game.participants; const missions=game.missions; const current=people.find(p=>p.id===me);
  if(!current)return <main className="shell"><header><div className="brand"><span className="logo">M</span><div><small>WELCOME</small><h1>{game.title}</h1></div></div></header><section className="select-user"><h2>誰として参加しますか？</h2><p>自分の名前を選んでください。</p><div className="people-grid">{people.map(p=><button key={p.id} onClick={()=>{setMe(p.id);localStorage.setItem(`mission-bingo-user-${gameId}`,p.id)}}><span style={{background:p.color}}>{initial(p.name)}</span><b>{p.name}</b></button>)}</div></section></main>;
  const approved=posts.filter(p=>p.participantId===me&&p.status==="approved"); const done=[...new Set(approved.map(p=>p.missionId))];
  const hasPeriod=Boolean(game.startsAt&&game.endsAt);const startMs=game.startsAt?new Date(game.startsAt).getTime():0;const endMs=game.endsAt?new Date(game.endsAt).getTime():Number.POSITIVE_INFINITY;
  const phase=now<startMs?"before":now>=endMs?"ended":"active";const remainingMs=phase==="before"?startMs-now:endMs-now;const days=Math.max(0,Math.floor(remainingMs/86400000));const hours=Math.max(0,Math.floor((remainingMs%86400000)/3600000));
  const periodText=phase==="ended"?"開催期間は終了しました":`${phase==="before"?"開始まで":"あと"} ${days>0?`${days}日 `:""}${hours}時間`;
  const highlightedCells=new Set(celebration?.kind==="complete"?missions.map(m=>m.id):(celebration?.lineIndices??[]).flatMap(index=>[...BINGO_LINES[index]]));
  const pending=posts.filter(p=>p.status==="pending"&&p.authorUid!==auth.currentUser?.uid&&!p.approvedBy.includes(auth.currentUser?.uid??""));
  const ranking=people.map(person=>{const ds=[...new Set(posts.filter(p=>p.participantId===person.id&&p.status==="approved").map(p=>p.missionId))];return{person,done:ds.length,bingo:bingoCount(ds)}}).sort((a,b)=>b.bingo-a.bingo||b.done-a.done);
  async function sendSubmission(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(missionToSubmit===null)return;setBusy(true);setError("");try{const form=new FormData(e.currentTarget);const file=form.get("photo") as File;const blob=await compressEvidencePhoto(file);await submitMission(gameId,me,missionToSubmit,blob,String(form.get("caption")??""));setMissionToSubmit(null)}catch(e){setError(e instanceof Error?e.message:"送信できませんでした")}finally{setBusy(false)}}
  async function approve(id:string){try{await approveMission(gameId,id)}catch(e){alert(e instanceof Error?e.message:"承認できませんでした")}}
  async function sendComment(){if(!selected||!comment.trim())return;try{await addPhotoComment(gameId,selected.id,me,comment);setComment("")}catch(e){alert(e instanceof Error?e.message:"送信できませんでした")}}
  async function shareGame(){
    const url=location.href;
    try{
      if(navigator.share){await navigator.share({title:game?.title??"ミッションビンゴ",text:"ミッションビンゴに参加してね！",url});setShareMessage("共有画面を開きました");return}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setShareMessage("共有URLをコピーしました");return}
      const area=document.createElement("textarea");area.value=url;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();setShareMessage("共有URLをコピーしました");
    }catch{setShareMessage("URLを長押ししてコピーしてください")}
  }
  async function savePeriod(){try{if(new Date(editEnd).getTime()<=new Date(editStart).getTime())throw new Error("終了日時は開始日時より後にしてください");await updateGame(gameId,{startsAt:new Date(editStart).toISOString(),endsAt:new Date(editEnd).toISOString()});setPeriodMessage("期間を保存しました")}catch(e){setPeriodMessage(e instanceof Error?e.message:"期間を保存できませんでした")}}
  async function saveAnnouncement(){try{await updateGame(gameId,{announcement:editAnnouncement.trim().slice(0,200)});setAnnouncementMessage("メッセージを保存しました")}catch(e){setAnnouncementMessage(e instanceof Error?e.message:"保存できませんでした")}}
  const openPost=(post:Submission)=>{setSelected(post);setComments([])};
  return <main className="shell"><header><div className="brand"><span className="logo">M</span><div><small>みんなで集める思い出</small><h1>{game.title}</h1></div></div><div className="header-actions"><div className="person" style={{"--person":current.color} as React.CSSProperties}><span>{initial(current.name)}</span>{current.name}</div><button className="settings-button" onClick={()=>setTab("settings")} aria-label="設定を開く" title="設定">⚙</button></div></header>
    <section className="hero"><div><span className="eyebrow">FAMILY QUEST</span><h2>今日の小さな冒険へ</h2><p>一つずつ、みんなの宝物に。</p></div><div className="hero-stamp"><b>{done.length}</b><span>/ 25</span><small>達成</small></div></section>{game.announcement&&<section className="reward-banner"><p>📣 {game.announcement}</p></section>}{hasPeriod&&<div className={`period-status ${phase}`}>{periodText}</div>}<div className="sync-status"><span>● {lastSync?`${lastSync.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})} 同期済み`:"同期中…"}</span><button onClick={()=>setSyncKey(v=>v+1)}>今すぐ更新</button></div>
    {tab==="bingo"&&<><section className="metrics"><div><span>達成マス</span><b>{done.length}<small>/25</small></b></div><div><span>ビンゴ</span><b>{bingoCount(done)}<small>本</small></b></div><div><span>承認待ち</span><b>{posts.filter(p=>p.participantId===me&&p.status==="pending").length}<small>件</small></b></div></section><section className={`board ${celebration?.kind==="countdown"?`board-countdown intensity-${celebration.intensity}`:""}`}>{missions.map(m=>{const post=posts.find(p=>p.participantId===me&&p.missionId===m.id);return <button key={m.id} className={`cell ${post?.status??""} ${highlightedCells.has(m.id)?"celebration-line":""}`} style={post?.status==="approved"?{"--fill":current.color} as React.CSSProperties:{}} onClick={()=>post?openPost(post):phase==="active"?setMissionToSubmit(m.id):alert(phase==="before"?"開催前です":"開催期間は終了しました")}><span className="number">{String(m.id+1).padStart(2,"0")}</span><span>{m.text}</span>{post?.status==="approved"&&<i>✓</i>}{post?.status==="pending"&&<i>…</i>}</button>})}</section><p className="board-note">{phase==="active"?"マスをタップして写真付きで達成申請できます":periodText}</p></>}
    {tab==="all"&&<section className="page"><div className="section-title"><div><small>TEAM PROGRESS</small><h2>みんなの進み具合</h2></div></div>{people.map(p=>{const ds=[...new Set(posts.filter(x=>x.participantId===p.id&&x.status==="approved").map(x=>x.missionId))];const remaining=25-ds.length;return <article className="progress-card" key={p.id}><span className="avatar" style={{background:p.color}}>{initial(p.name)}</span><div><b>{p.name}</b>{remaining===0?<small className="near-complete complete">🏆 COMPLETE！</small>:remaining<=5?<small className="near-complete">🔥 コンプリートまであと{remaining}！</small>:null}<div className="bar"><i style={{width:`${ds.length*4}%`,background:p.color}}/></div></div><strong>{ds.length}<small>/25</small></strong></article>})}</section>}
    {tab==="approve"&&<section className="page"><div className="section-title"><div><small>HIGH FIVE!</small><h2>承認を待っています</h2></div><span className="count">{pending.length}件</span></div>{pending.length===0?<div className="empty">✓<b>すべて確認済み！</b><span>次の挑戦を応援しよう</span></div>:pending.map(post=>{const p=people.find(x=>x.id===post.participantId)!;return <article className="post-card" key={post.id}><img src={photoBytesToUrl(post.photoBytes)} alt="証拠写真"/><div className="post-copy"><small>{missions[post.missionId]?.text}</small><h3><i style={{background:p.color}}/>{p.name}のチャレンジ</h3><p>「{post.caption||"達成しました！"}」</p><div className="approval-row"><span>{post.approvedBy.length}/{game.approvalsRequired}人が承認</span><button onClick={()=>approve(post.id)}>いいね、承認！</button></div></div></article>})}</section>}
    {tab==="album"&&<section className="page"><div className="section-title"><div><small>OUR MEMORIES</small><h2>思い出アルバム</h2></div></div><div className="album">{posts.filter(p=>p.status==="approved").map(post=>{const p=people.find(x=>x.id===post.participantId)!;return <button className="memory" key={post.id} onClick={()=>openPost(post)}><img src={photoBytesToUrl(post.photoBytes)} alt="思い出"/><div><span style={{color:p.color}}>● {p.name}</span><b>{missions[post.missionId]?.text}</b><small>写真にコメントできます</small></div></button>})}</div></section>}
    {tab==="rank"&&<section className="page"><div className="section-title"><div><small>FAMILY LEAGUE</small><h2>ランキング</h2></div></div><div className="ranking">{ranking.map((r,i)=><article key={r.person.id} className={i===0?"winner":""}><em>{i+1}</em><span className="avatar" style={{background:r.person.color}}>{initial(r.person.name)}</span><b>{r.person.name}</b><div><strong>{r.bingo} BINGO</strong><small>{r.done}マス達成</small></div></article>)}</div></section>}
    {tab==="settings"&&<section className="page"><div className="section-title"><div><small>SETTINGS</small><h2>{auth.currentUser?.uid===game.ownerUid?"ゲーム設定":"共有"}</h2></div></div>{auth.currentUser?.uid===game.ownerUid&&<><article className="admin-card"><span className="owner-badge">作成者のみ</span><b>全員へのメッセージ</b><label>自由メッセージ<textarea value={editAnnouncement} onChange={e=>setEditAnnouncement(e.target.value)} maxLength={200} placeholder="例：1列ビンゴで○○円！最後まで本気で楽しもう！"/></label><button onClick={saveAnnouncement}>メッセージを保存</button>{announcementMessage&&<small>{announcementMessage}</small>}</article><article className="period-card"><span className="owner-badge">作成者のみ</span><b>開催期間</b><div className="period-fields"><label>開始日時<input type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)}/></label><label>終了日時<input type="datetime-local" value={editEnd} onChange={e=>setEditEnd(e.target.value)}/></label></div><button onClick={savePeriod}>期間を保存</button>{periodMessage&&<small>{periodMessage}</small>}</article></>}<article className="share-card"><b>このゲーム専用の共有URL</b><small>{location.href}</small><button onClick={shareGame}>共有する・URLをコピー</button>{shareMessage&&<strong className="share-message">{shareMessage}</strong>}</article><p className="settings-note">このURLを受け取った人は、最初に自分の名前を一度だけ選びます。</p><article className="safari-guide"><b>iPhoneで使う方へ</b><ol><li>LINEの共有URLをタップ</li><li>共有メニューから「Safariで開く」</li><li>必要なら「ホーム画面に追加」</li></ol><small>翌日も専用URLまたはホーム画面から続けられます。</small></article></section>}
    <nav>{[["bingo","▦","ビンゴ"],["all","●","みんな"],["approve","✓","承認"],["album","▣","アルバム"],["rank","♛","順位"]].map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><i>{icon}</i><span>{label}</span>{id==="approve"&&pending.length>0&&<b>{pending.length}</b>}</button>)}</nav>
    {celebration&&<CelebrationOverlay effect={celebration} color={current.color} name={current.name} onClose={()=>setCelebration(null)}/>}
    {missionToSubmit!==null&&<div className="overlay"><article className="modal form-modal"><button className="close" onClick={()=>setMissionToSubmit(null)}>×</button><div className="modal-body"><span className="mission-label">MISSION {missionToSubmit+1}</span><h2>{missions[missionToSubmit]?.text}</h2><form onSubmit={sendSubmission}><label>証拠写真<input name="photo" type="file" accept="image/*" capture="environment" required/></label><label>ひとこと<textarea name="caption" maxLength={200} placeholder="楽しかったことや感想"/></label>{error&&<p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy?"写真を圧縮して送信中…":"達成申請を送る"}</button></form></div></article></div>}
    {selected&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><article className="modal"><button className="close" onClick={()=>setSelected(null)}>×</button><img className="modal-photo" src={photoBytesToUrl(selected.photoBytes)} alt="投稿写真"/><div className="modal-body"><span className="mission-label">MISSION {selected.missionId+1}</span><h2>{missions[selected.missionId]?.text}</h2><p className="caption">「{selected.caption||"達成しました！"}」</p><h3>写真へのコメント <small>{comments.length}</small></h3><div className="comments">{comments.length===0?<p className="no-comment">最初のコメントを残そう！</p>:comments.map(c=>{const p=people.find(x=>x.id===c.participantId);return <div key={c.id}><span>{initial(p?.name??"？")}</span><p><b>{p?.name??"参加者"}</b>{c.text}</p></div>})}</div><div className="comment-form"><input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendComment()} placeholder="写真にコメントする…" maxLength={120}/><button onClick={sendComment} disabled={!comment.trim()}>送信</button></div></div></article></div>}
  </main>;
}

export default function Home(){
  const [ready,setReady]=useState(false); const [authError,setAuthError]=useState(""); const [gameId,setGameId]=useState("");
  useEffect(()=>{ensureAnonymousUser().then(()=>{const queryId=new URLSearchParams(location.search).get("game")??"";const recentId=localStorage.getItem("mission-bingo-recent-game")??"";const id=queryId||recentId;if(id&&!queryId)history.replaceState(null,"",`?game=${id}`);if(id)localStorage.setItem("mission-bingo-recent-game",id);setGameId(id);setReady(true)}).catch(e=>setAuthError(e instanceof Error?e.message:"Firebaseに接続できません"))},[]);
  if(authError)return <main className="shell"><div className="loading error">接続エラー：{authError}</div></main>;
  if(!ready)return <main className="shell"><div className="loading">Firebaseに接続しています…</div></main>;
  if(!gameId)return <CreateScreen onCreated={id=>{localStorage.setItem("mission-bingo-recent-game",id);history.replaceState(null,"",`?game=${id}`);setGameId(id)}}/>;
  return <GameApp gameId={gameId}/>;
}
