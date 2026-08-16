"use client";

import { useEffect, useRef, useState } from "react";
import { ensureAnonymousUser, auth } from "../lib/firebase-client";
import { compressEvidencePhoto } from "../lib/image";
import {
  addPhotoComment, approveMission, cancelSubmission, createGame,
  loadAlbumComments, photoBytesToUrl, subscribeComments, subscribeGame,
  subscribeSubmissions, submitMission, updateGame,
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
type SavedGame={id:string;title:string};
const SAVED_GAMES_KEY="mission-bingo-saved-games";
function readSavedGames():SavedGame[]{try{const value=JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)??"[]");return Array.isArray(value)?value.filter(item=>item&&typeof item.id==="string"&&typeof item.title==="string").slice(0,20):[]}catch{return[]}}
function rememberGame(id:string,title:string){const games=readSavedGames().filter(game=>game.id!==id);localStorage.setItem(SAVED_GAMES_KEY,JSON.stringify([{id,title},...games].slice(0,20)))}
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

function MissionSettings({game,posts}:{game:Game;posts:Submission[]}){
  const [values,setValues]=useState(()=>game.missions.map(m=>m.text));
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const [approvalCount,setApprovalCount]=useState(game.approvalsRequired);
  const [approvalMessage,setApprovalMessage]=useState("");
  const [savingApprovals,setSavingApprovals]=useState(false);
  const usedIds=new Set(posts.map(post=>post.missionId));
  useEffect(()=>setValues(game.missions.map(m=>m.text)),[game.missions]);
  useEffect(()=>setApprovalCount(game.approvalsRequired),[game.approvalsRequired]);
  async function save(){
    const missions=values.map((text,id)=>({id,text:text.trim()}));
    if(missions.some(m=>!m.text)){setMessage("空欄のミッションがあります");return}
    setSaving(true);setMessage("");
    try{await updateGame(game.id,{missions});setMessage("ミッションを保存しました")}
    catch(e){setMessage(e instanceof Error?e.message:"保存できませんでした")}
    finally{setSaving(false)}
  }
  async function saveApprovalCount(){
    if(approvalCount===game.approvalsRequired){setApprovalMessage("現在と同じ承認人数です");return}
    const alreadyEnough=posts.filter(post=>post.status==="pending"&&post.approvedBy.length>=approvalCount);
    if(alreadyEnough.length){setApprovalMessage(`承認待ち${alreadyEnough.length}件が新しい人数に到達済みのため、先に処理してから変更してください`);return}
    if(!confirm(`必要な承認人数を ${game.approvalsRequired}人 から ${approvalCount}人へ変更しますか？\n\n正式承認済みの投稿はそのままです。承認待ちの投稿と今後の申請に新しい人数が適用されます。`))return;
    setSavingApprovals(true);setApprovalMessage("");
    try{await updateGame(game.id,{approvalsRequired:approvalCount});setApprovalMessage(`必要な承認人数を${approvalCount}人に変更しました`)}
    catch(e){setApprovalMessage(e instanceof Error?e.message:"承認人数を変更できませんでした")}
    finally{setSavingApprovals(false)}
  }
  return <><article className="approval-settings admin-card"><span className="owner-badge">管理者のみ</span><b>必要な承認人数</b><p>正式承認済みの投稿は変更されません。承認待ちの投稿と、この先の申請に新しい人数が適用されます。</p><label>承認人数<select value={approvalCount} onChange={e=>setApprovalCount(Number(e.target.value))}>{Array.from({length:Math.max(1,game.participants.length-1)},(_,i)=><option key={i+1} value={i+1}>{i+1}人</option>)}</select></label><button onClick={saveApprovalCount} disabled={savingApprovals||approvalCount===game.approvalsRequired}>{savingApprovals?"保存中…":`${approvalCount}人承認に変更`}</button>{approvalMessage&&<small>{approvalMessage}</small>}</article><article className="mission-settings admin-card"><span className="owner-badge">一番上の参加者のみ</span><b>ミッションを編集</b><p>申請履歴があるミッションは、進行データを守るため編集できません。</p><div className="mission-settings-list">{game.missions.map((mission,index)=>{const used=usedIds.has(mission.id);return <label key={mission.id}><span>{mission.id+1}</span><input value={values[index]??""} disabled={used} onChange={e=>setValues(current=>current.map((value,i)=>i===index?e.target.value:value))}/>{used&&<small>使用済み</small>}</label>})}</div><button onClick={save} disabled={saving}>{saving?"保存中…":"変更を保存"}</button>{message&&<small>{message}</small>}</article></>;
}

function GameApp({gameId,onSwitchGame,onCreateGame}:{gameId:string;onSwitchGame:(id:string)=>void;onCreateGame:()=>void}){
  const [game,setGame]=useState<Game|null>(null); const [posts,setPosts]=useState<Submission[]>([]);
  const [me,setMe]=useState(""); const [tab,setTab]=useState("bingo"); const [selected,setSelected]=useState<Submission|null>(null);
  const [comments,setComments]=useState<PhotoComment[]>([]); const [comment,setComment]=useState(""); const [error,setError]=useState("");
  const [missionToSubmit,setMissionToSubmit]=useState<number|null>(null); const [busy,setBusy]=useState(false);
  const [shareMessage,setShareMessage]=useState("");
  const [syncKey,setSyncKey]=useState(0); const [lastSync,setLastSync]=useState<Date|null>(null); const [confirmedPosts,setConfirmedPosts]=useState<Submission[]|null>(null);
  const [online,setOnline]=useState(true);
  const [now,setNow]=useState(Date.now());
  const [editStart,setEditStart]=useState(""); const [editEnd,setEditEnd]=useState(""); const [periodMessage,setPeriodMessage]=useState("");
  const [editAnnouncement,setEditAnnouncement]=useState(""); const [announcementMessage,setAnnouncementMessage]=useState("");
  const [savedGames,setSavedGames]=useState<SavedGame[]>([]);
  const [albumComments,setAlbumComments]=useState<Record<string,PhotoComment[]>>({});
  const [albumSelecting,setAlbumSelecting]=useState(false); const [albumSelection,setAlbumSelection]=useState<string[]>([]); const [exportingAlbum,setExportingAlbum]=useState(false);
  const [celebration,setCelebration]=useState<Celebration|null>(null); const celebrationKey=useRef(""); const previousDone=useRef<number[]>([]);
  const albumLoadKey=useRef("");
  useEffect(()=>subscribeGame(gameId,value=>{setGame(value);setLastSync(new Date());setError("")},()=>setError("ゲーム情報を同期できません。通信を確認して再試行してください。")),[gameId,syncKey]);
  useEffect(()=>subscribeSubmissions(gameId,(value,fromCache)=>{setPosts(value);setLastSync(new Date());if(!fromCache)setConfirmedPosts(value)},()=>setError("投稿を同期できません。通信を確認して再試行してください。")),[gameId,syncKey]);
  useEffect(()=>{const reconnect=()=>{if(document.visibilityState==="visible")setSyncKey(v=>v+1)};const pageShow=()=>setSyncKey(v=>v+1);document.addEventListener("visibilitychange",reconnect);window.addEventListener("focus",reconnect);window.addEventListener("online",reconnect);window.addEventListener("pageshow",pageShow);return()=>{document.removeEventListener("visibilitychange",reconnect);window.removeEventListener("focus",reconnect);window.removeEventListener("online",reconnect);window.removeEventListener("pageshow",pageShow)}},[]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);
  useEffect(()=>{const saved=localStorage.getItem(`mission-bingo-user-${gameId}`);if(saved)setMe(saved)},[gameId]);
  useEffect(()=>{if(!game)return;const params=new URLSearchParams(location.search);const playerId=params.get("player");if(!playerId||!game.participants.some(person=>person.id===playerId))return;setMe(playerId);localStorage.setItem(`mission-bingo-user-${gameId}`,playerId);params.delete("player");history.replaceState(null,"",`${location.pathname}?${params.toString()}`)},[game,gameId]);
  useEffect(()=>{if(game){setEditStart(game.startsAt?localDateTime(new Date(game.startsAt)):defaultStart());setEditEnd(game.endsAt?localDateTime(new Date(game.endsAt)):defaultEnd());setEditAnnouncement(game.announcement??"")}},[game]);
  useEffect(()=>{if(game){rememberGame(game.id,game.title);setSavedGames(readSavedGames())}},[game]);
  useEffect(()=>{if(!game)return;const canManage=auth.currentUser?.uid===game.ownerUid||auth.currentUser?.uid===game.primaryEditorUid;if(!canManage&&tab==="settings")setTab("bingo")},[game,tab]);
  useEffect(()=>{if(tab!=="album"||!game)return;const albumFinalized=Boolean(game.endsAt)&&now>=new Date(game.endsAt!).getTime();if(!albumFinalized){setAlbumComments({});albumLoadKey.current="";return}const ids=posts.filter(post=>post.status==="approved").map(post=>post.id).sort();const key=`${gameId}:${ids.join(",")}`;if(albumLoadKey.current===key)return;albumLoadKey.current=key;loadAlbumComments(gameId,ids).then(setAlbumComments).catch(()=>setAlbumComments({}))},[tab,posts,game,gameId,now]);
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
  const canEdit=auth.currentUser?.uid===game.ownerUid||auth.currentUser?.uid===game.primaryEditorUid;
  const resubmitting=missionToSubmit!==null&&posts.some(post=>post.participantId===me&&post.missionId===missionToSubmit&&post.status==="pending");
  async function sendSubmission(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(missionToSubmit===null)return;setBusy(true);setError("");try{const form=new FormData(e.currentTarget);const file=form.get("photo") as File;const blob=await compressEvidencePhoto(file);await submitMission(gameId,me,missionToSubmit,blob,String(form.get("caption")??""));setMissionToSubmit(null)}catch(e){setError(e instanceof Error?e.message:"送信できませんでした")}finally{setBusy(false)}}
  async function approve(id:string){try{await approveMission(gameId,id)}catch(e){alert(e instanceof Error?e.message:"承認できませんでした")}}
  async function sendComment(){if(!selected||!comment.trim())return;try{await addPhotoComment(gameId,selected.id,me,comment);setComment("")}catch(e){alert(e instanceof Error?e.message:"送信できませんでした")}}
  async function cancelPending(post:Submission){
    if(!confirm("この達成申請を取り消しますか？\n取り消した後、同じマスから再申請できます。"))return;
    setBusy(true);
    try{await cancelSubmission(gameId,post.id);setSelected(null);setError("")}
    catch(e){setError(e instanceof Error?e.message:"申請を取り消せませんでした")}
    finally{setBusy(false)}
  }
  async function shareGame(){
    const url=location.href;
    try{
      if(navigator.share){await navigator.share({title:game?.title??"ミッションビンゴ",text:"ミッションビンゴに参加してね！",url});setShareMessage("共有画面を開きました");return}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setShareMessage("共有URLをコピーしました");return}
      const area=document.createElement("textarea");area.value=url;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();setShareMessage("共有URLをコピーしました");
    }catch{setShareMessage("URLを長押ししてコピーしてください")}
  }
  async function shareParticipant(participantId:string,participantName:string){
    const url=`${location.origin}${location.pathname}?game=${encodeURIComponent(gameId)}&player=${encodeURIComponent(participantId)}`;
    try{
      if(navigator.share){await navigator.share({title:game?.title??"ミッションビンゴ",text:`${participantName}さん用のミッションビンゴです`,url});setShareMessage(`${participantName}さん用の共有画面を開きました`);return}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setShareMessage(`${participantName}さん用URLをコピーしました`);return}
      const area=document.createElement("textarea");area.value=url;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();setShareMessage(`${participantName}さん用URLをコピーしました`)
    }catch{setShareMessage("URLを長押ししてコピーしてください")}
  }
  async function savePeriod(){try{if(new Date(editEnd).getTime()<=new Date(editStart).getTime())throw new Error("終了日時は開始日時より後にしてください");await updateGame(gameId,{startsAt:new Date(editStart).toISOString(),endsAt:new Date(editEnd).toISOString()});setPeriodMessage("期間を保存しました")}catch(e){setPeriodMessage(e instanceof Error?e.message:"期間を保存できませんでした")}}
  async function saveAnnouncement(){try{await updateGame(gameId,{announcement:editAnnouncement.trim().slice(0,200)});setAnnouncementMessage("メッセージを保存しました")}catch(e){setAnnouncementMessage(e instanceof Error?e.message:"保存できませんでした")}}
  function forgetSavedGame(id:string){const next=readSavedGames().filter(saved=>saved.id!==id);localStorage.setItem(SAVED_GAMES_KEY,JSON.stringify(next));setSavedGames(next)}
  function reselectParticipant(){if(!confirm("この端末で使う参加者を選び直しますか？"))return;localStorage.removeItem(`mission-bingo-user-${gameId}`);setTab("bingo");setMe("")}
  function toggleAlbumPhoto(id:string){setAlbumSelection(selected=>selected.includes(id)?selected.filter(value=>value!==id):selected.length>=20?(alert("選べる写真は20枚までです"),selected):[...selected,id])}
  async function saveAlbumCollage(){
    const selectedPosts=albumSelection.map(id=>posts.find(post=>post.id===id)).filter((post):post is Submission=>Boolean(post?.photoBytes));if(selectedPosts.length===0)return;
    setExportingAlbum(true);
    try{const title=game?.title??"ミッションビンゴ";const columns=4,cellWidth=360,cellHeight=290,headerHeight=120,rows=Math.ceil(selectedPosts.length/columns);const canvas=document.createElement("canvas");canvas.width=columns*cellWidth;canvas.height=headerHeight+rows*cellHeight;const context=canvas.getContext("2d");if(!context)throw new Error("画像を作成できません");context.fillStyle="#f5f0e6";context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle="#213638";context.font="bold 42px sans-serif";context.fillText(title,42,55);context.font="24px sans-serif";context.fillText("MISSION BINGO / PLAY THE REAL WORLD.",42,92);for(let index=0;index<selectedPosts.length;index++){const post=selectedPosts[index];const url=photoBytesToUrl(post.photoBytes);try{const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const value=new Image();value.onload=()=>resolve(value);value.onerror=reject;value.src=url});const x=(index%columns)*cellWidth+8,y=headerHeight+Math.floor(index/columns)*cellHeight+8,w=cellWidth-16,h=cellHeight-16;const scale=Math.max(w/image.width,h/image.height),sw=w/scale,sh=h/scale,sx=(image.width-sw)/2,sy=(image.height-sh)/2;context.drawImage(image,sx,sy,sw,sh,x,y,w,h)}finally{URL.revokeObjectURL(url)}}const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("画像を保存できません")),"image/jpeg",.88));const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`mission-bingo-album-${new Date().toISOString().slice(0,10)}.jpg`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}catch(e){alert(e instanceof Error?e.message:"アルバム画像を作成できませんでした")}finally{setExportingAlbum(false)}
  }
  const openPost=(post:Submission)=>{setSelected(post);setComments([])};
  return <main className="shell"><header><div className="brand"><span className="logo">M</span><div><small>みんなで集める思い出</small><h1>{game.title}</h1></div></div><div className="header-actions"><div className="person" style={{"--person":current.color} as React.CSSProperties}><span>{initial(current.name)}</span>{current.name}</div>{canEdit&&<button className="settings-button" onClick={()=>setTab("settings")} aria-label="設定を開く" title="設定">⚙</button>}</div></header>
    <section className="hero"><div><span className="eyebrow">MISSION BINGO</span><h2>PLAY THE REAL WORLD.</h2><p>日常を、ゲームに。</p></div><div className="hero-stamp"><b>{done.length}</b><span>/ 25</span><small>達成</small></div></section>{game.announcement&&<section className="reward-banner"><p>📣 {game.announcement}</p></section>}{hasPeriod&&<div className={`period-status ${phase}`}>{periodText}</div>}{!online&&<div className="offline-banner">オフラインです。表示中の内容は前回同期時点のものです。</div>}{error&&<div className="sync-error">{error}<button onClick={()=>setSyncKey(v=>v+1)}>再試行</button></div>}<div className="sync-status"><span>● {lastSync?`${lastSync.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})} 同期済み`:"同期中…"}</span><button onClick={()=>setSyncKey(v=>v+1)}>今すぐ更新</button></div>
    {tab==="bingo"&&<><section className="metrics"><div><span>達成マス</span><b>{done.length}<small>/25</small></b></div><div><span>ビンゴ</span><b>{bingoCount(done)}<small>本</small></b></div><div><span>承認待ち</span><b>{posts.filter(p=>p.participantId===me&&p.status==="pending").length}<small>件</small></b></div></section><section className={`board ${celebration?.kind==="countdown"?`board-countdown intensity-${celebration.intensity}`:""}`}>{missions.map(m=>{const post=posts.find(p=>p.participantId===me&&p.missionId===m.id);return <button key={m.id} className={`cell ${post?.status??""} ${highlightedCells.has(m.id)?"celebration-line":""}`} style={post?.status==="approved"?{"--fill":current.color} as React.CSSProperties:{}} onClick={()=>post?openPost(post):phase==="active"?setMissionToSubmit(m.id):alert(phase==="before"?"開催前です":"開催期間は終了しました")}><span className="number">{String(m.id+1).padStart(2,"0")}</span><span>{m.text}</span>{post?.status==="approved"&&<i>✓</i>}{post?.status==="pending"&&<i>…</i>}</button>})}</section><p className="board-note">{phase==="active"?"マスをタップして写真付きで達成申請できます":periodText}</p></>}
    {tab==="all"&&<section className="page"><div className="section-title"><div><small>TEAM PROGRESS</small><h2>みんなの進み具合</h2></div></div>{people.map(p=>{const ds=[...new Set(posts.filter(x=>x.participantId===p.id&&x.status==="approved").map(x=>x.missionId))];const remaining=25-ds.length;return <article className="progress-card" key={p.id}><span className="avatar" style={{background:p.color}}>{initial(p.name)}</span><div><b>{p.name}</b>{remaining===0?<small className="near-complete complete">🏆 COMPLETE！</small>:remaining<=5?<small className="near-complete">🔥 コンプリートまであと{remaining}！</small>:null}<div className="bar"><i style={{width:`${ds.length*4}%`,background:p.color}}/></div></div><strong>{ds.length}<small>/25</small></strong></article>})}</section>}
    {tab==="approve"&&<section className="page"><div className="section-title"><div><small>HIGH FIVE!</small><h2>承認を待っています</h2></div><span className="count">{pending.length}件</span></div>{pending.length===0?<div className="empty">✓<b>すべて確認済み！</b><span>次の挑戦を応援しよう</span></div>:pending.map(post=>{const p=people.find(x=>x.id===post.participantId)!;return <article className="post-card" key={post.id}><img src={photoBytesToUrl(post.photoBytes)} alt="証拠写真" loading="lazy" decoding="async"/><div className="post-copy"><small>{missions[post.missionId]?.text}</small><h3><i style={{background:p.color}}/>{p.name}のチャレンジ</h3><p>「{post.caption||"達成しました！"}」</p><div className="approval-row"><span>{post.approvedBy.length}/{game.approvalsRequired}人が承認</span><div className="approval-actions"><button className="comment-button" onClick={()=>openPost(post)}>写真にコメント</button><button onClick={()=>approve(post.id)}>いいね、承認！</button></div></div></div></article>})}</section>}
    {tab==="album"&&<section className="page"><div className="section-title"><div><small>OUR MEMORIES</small><h2>思い出アルバム</h2></div></div>{phase==="ended"&&<div className="album-export"><b>完成アルバムを作る</b><small>お気に入りを最大20枚選び、1枚のJPEGに保存できます。</small>{!albumSelecting?<button onClick={()=>{setAlbumSelection([]);setAlbumSelecting(true)}}>写真を選ぶ</button>:<div><span>{albumSelection.length} / 20枚</span><button onClick={()=>setAlbumSelecting(false)}>キャンセル</button><button onClick={saveAlbumCollage} disabled={albumSelection.length===0||exportingAlbum}>{exportingAlbum?"作成中…":"1枚にして保存"}</button></div>}</div>}<div className={`album ${albumSelecting?"selecting":""}`}>{posts.filter(p=>p.status==="approved").map(post=>{const p=people.find(x=>x.id===post.participantId)!;const notes=(albumComments[post.id]??[]).slice(-2);const selectedPhoto=albumSelection.includes(post.id);return <button className={`memory ${selectedPhoto?"selected":""}`} key={post.id} onClick={()=>albumSelecting?toggleAlbumPhoto(post.id):openPost(post)}><div className="memory-photo"><img src={photoBytesToUrl(post.photoBytes)} alt="思い出" loading="lazy" decoding="async"/>{albumSelecting&&<i className="album-check">{selectedPhoto?"✓":"＋"}</i>}{notes.map((note,index)=><em key={note.id} className={`graffiti graffiti-${index}`}>{note.text}</em>)}</div><div className="memory-copy"><span style={{color:p.color}}>● {p.name}</span><b>{missions[post.missionId]?.text}</b><small>{albumSelecting?selectedPhoto?"選択済み":"タップして選択":"写真にコメントできます"}</small></div></button>})}</div></section>}
    {tab==="rank"&&<section className="page"><div className="section-title"><div><small>FAMILY LEAGUE</small><h2>ランキング</h2></div></div><div className="ranking">{ranking.map((r,i)=><article key={r.person.id} className={i===0?"winner":""}><em>{i+1}</em><span className="avatar" style={{background:r.person.color}}>{initial(r.person.name)}</span><b>{r.person.name}</b><div><strong>{r.bingo} BINGO</strong><small>{r.done}マス達成</small></div></article>)}</div></section>}
    {tab==="settings"&&canEdit&&<section className="page"><div className="section-title"><div><small>SETTINGS</small><h2>ゲーム設定</h2></div></div><article className="game-switcher"><b>この端末のビンゴ</b><small>ここには、この端末で開いたビンゴだけが表示されます</small><div>{savedGames.map(saved=><button key={saved.id} className={saved.id===gameId?"current":""} onClick={()=>saved.id!==gameId&&onSwitchGame(saved.id)}><span>{saved.title}</span><i>{saved.id===gameId?"表示中":"開く"}</i></button>)}</div><button className="new-game-button" onClick={onCreateGame}>＋ 別のビンゴを新しく作る</button></article><article className="admin-card"><span className="owner-badge">管理者のみ</span><b>全員へのメッセージ</b><label>自由メッセージ<textarea value={editAnnouncement} onChange={e=>setEditAnnouncement(e.target.value)} maxLength={200} placeholder="例：最後まで本気で楽しもう！"/></label><button onClick={saveAnnouncement}>メッセージを保存</button>{announcementMessage&&<small>{announcementMessage}</small>}</article><article className="period-card"><span className="owner-badge">管理者のみ</span><b>開催期間</b><div className="period-fields"><label>開始日時<input type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)}/></label><label>終了日時<input type="datetime-local" value={editEnd} onChange={e=>setEditEnd(e.target.value)}/></label></div><button onClick={savePeriod}>期間を保存</button>{periodMessage&&<small>{periodMessage}</small>}</article><MissionSettings game={game} posts={posts}/><article className="share-card"><b>このゲーム専用の共有URL</b><small>{location.href}</small><button onClick={shareGame}>共有する・URLをコピー</button>{shareMessage&&<strong className="share-message">{shareMessage}</strong>}</article><p className="settings-note">共有URLには現在のビンゴだけが含まれます。ほかのビンゴが相手に見えることはありません。</p><article className="safari-guide"><b>iPhoneで使う方へ</b><ol><li>LINEの共有URLをタップ</li><li>共有メニューから「Safariで開く」</li><li>必要なら「ホーム画面に追加」</li></ol><small>翌日も専用URLまたはホーム画面から続けられます。</small></article></section>}
    {tab==="settings"&&canEdit&&<section className="participant-share-wrap"><article className="share-card participant-share"><b>参加者ごとの専用URL</b><small>送る相手の名前を選ぶと、その人として自動的に始まります。</small><div>{people.map(person=><button key={person.id} onClick={()=>shareParticipant(person.id,person.name)} style={{"--participant":person.color} as React.CSSProperties}><i>{initial(person.name)}</i><span>{person.name}さん用を共有</span></button>)}</div>{shareMessage&&<strong className="share-message">{shareMessage}</strong>}</article></section>}
    {tab==="settings"&&canEdit&&<section className="saved-game-remove-wrap"><article className="share-card saved-game-remove"><b>この端末のビンゴを整理</b><small>この端末の一覧から外すだけで、Firebase上のゲームデータは消えません。</small><div>{savedGames.map(saved=><div key={saved.id}><span>{saved.title}{saved.id===gameId&&<i>表示中</i>}</span><button onClick={()=>forgetSavedGame(saved.id)} disabled={saved.id===gameId}>{saved.id===gameId?"表示中":"一覧から消す"}</button></div>)}</div></article></section>}
    {tab==="settings"&&canEdit&&<section className="admin-reselect-wrap"><article className="share-card admin-reselect"><b>この端末の参加者</b><small>現在は「{current.name}」としてプレイしています。</small><button onClick={reselectParticipant}>参加者を選び直す</button></article></section>}
    <nav>{[["bingo","▦","ビンゴ"],["all","●","みんな"],["approve","✓","承認"],["album","▣","アルバム"],["rank","♛","順位"]].map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><i>{icon}</i><span>{label}</span>{id==="approve"&&pending.length>0&&<b>{pending.length}</b>}</button>)}</nav>
    {celebration&&<CelebrationOverlay effect={celebration} color={current.color} name={current.name} onClose={()=>setCelebration(null)}/>}
    {missionToSubmit!==null&&<div className="overlay"><article className="modal form-modal"><button className="close" onClick={()=>setMissionToSubmit(null)}>×</button><div className="modal-body"><span className="mission-label">MISSION {missionToSubmit+1}</span><h2>{missions[missionToSubmit]?.text}</h2>{resubmitting&&<p className="resubmit-note">新しい写真を送ると、これまでの承認数は0に戻ります。</p>}<form onSubmit={sendSubmission}><label>証拠写真<input name="photo" type="file" accept="image/*" required/><small className="photo-choice-note">カメラで撮るか、保存済みの写真・ファイルから選べます</small></label><label>ひとこと<textarea name="caption" maxLength={200} placeholder="楽しかったことや感想"/></label>{error&&<p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy?"写真を圧縮して送信中…":resubmitting?"新しい写真で再申請する":"達成申請を送る"}</button></form></div></article></div>}
    {selected&&<div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><article className="modal"><button className="close" onClick={()=>setSelected(null)}>×</button><img className="modal-photo" src={photoBytesToUrl(selected.photoBytes)} alt="投稿写真" decoding="async"/><div className="modal-body"><span className="mission-label">MISSION {selected.missionId+1}</span><h2>{missions[selected.missionId]?.text}</h2><p className="caption">「{selected.caption||"達成しました！"}」</p>{selected.status==="pending"&&selected.authorUid===auth.currentUser?.uid&&<div className="resubmit-actions"><button onClick={()=>{setMissionToSubmit(selected.missionId);setSelected(null)}}>写真を選び直して再申請</button><button onClick={()=>cancelPending(selected)} disabled={busy}>申請を取り消す</button></div>}<h3>写真へのコメント <small>{comments.length}</small></h3><div className="comments">{comments.length===0?<p className="no-comment">最初のコメントを残そう！</p>:comments.map(c=>{const p=people.find(x=>x.id===c.participantId);return <div key={c.id}><span>{initial(p?.name??"？")}</span><p><b>{p?.name??"参加者"}</b>{c.text}</p></div>})}</div><div className="comment-form"><input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendComment()} placeholder="写真にコメントする…" maxLength={120}/><button onClick={sendComment} disabled={!comment.trim()}>送信</button></div></div></article></div>}
  </main>;
}

export default function Home(){
  const [ready,setReady]=useState(false); const [authError,setAuthError]=useState(""); const [gameId,setGameId]=useState("");
  useEffect(()=>{if("serviceWorker" in navigator)navigator.serviceWorker.register("/mission-bingo/sw.js",{scope:"/mission-bingo/"}).catch(()=>{});ensureAnonymousUser().then(()=>{const params=new URLSearchParams(location.search);const queryId=params.get("game")??"";const recentId=localStorage.getItem("mission-bingo-recent-game")??"";const id=params.has("new")?"":queryId||recentId;if(id&&!queryId)history.replaceState(null,"",`?game=${id}`);if(id)localStorage.setItem("mission-bingo-recent-game",id);setGameId(id);setReady(true)}).catch(e=>setAuthError(e instanceof Error?e.message:"Firebaseに接続できません"))},[]);
  if(authError)return <main className="shell"><div className="loading error">接続エラー：{authError}</div></main>;
  if(!ready)return <main className="shell"><div className="loading">Firebaseに接続しています…</div></main>;
  const openGame=(id:string)=>{localStorage.setItem("mission-bingo-recent-game",id);history.replaceState(null,"",`?game=${id}`);setGameId(id)};
  if(!gameId)return <CreateScreen onCreated={openGame}/>;
  return <GameApp gameId={gameId} onSwitchGame={openGame} onCreateGame={()=>{history.replaceState(null,"","?new=1");setGameId("")}}/>;
}
