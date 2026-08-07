import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { Bytes } from "firebase/firestore";
import { auth, db } from "./firebase-client";

export type NewComment = { text: string; participantId: string };

export async function submitMission(gameId:string, participantId:string, missionId:number, photo:Blob, caption:string){
  const user=auth.currentUser; if(!user) throw new Error("端末認証が完了していません");
  const submissionId=`${participantId}_${missionId}`;
  if(photo.size>520_000) throw new Error("写真サイズが大きすぎます。もう一度選択してください");
  const photoBytes=Bytes.fromUint8Array(new Uint8Array(await photo.arrayBuffer()));
  await setDoc(doc(db,"games",gameId,"submissions",submissionId),{
    participantId,authorUid:user.uid,missionId,photoBytes,photoContentType:"image/jpeg",
    caption:caption.slice(0,200),status:"pending",approvedBy:[],createdAt:serverTimestamp(),completedAt:null,
  });
}

export function photoBytesToUrl(value:unknown){
  if(!(value instanceof Bytes)) return "";
  const source=value.toUint8Array();
  const copy=new Uint8Array(source.length);copy.set(source);
  return URL.createObjectURL(new Blob([copy.buffer],{type:"image/jpeg"}));
}

export async function approveMission(gameId:string, submissionId:string){
  const user=auth.currentUser;if(!user)throw new Error("端末認証が完了していません");
  const gameRef=doc(db,"games",gameId);const subRef=doc(db,"games",gameId,"submissions",submissionId);
  await runTransaction(db,async tx=>{
    const [gameSnap,subSnap]=await Promise.all([tx.get(gameRef),tx.get(subRef)]);
    if(!gameSnap.exists()||!subSnap.exists())throw new Error("申請が見つかりません");
    const sub=subSnap.data();if(sub.authorUid===user.uid)throw new Error("自分の申請は承認できません");
    const approvedBy:string[]=sub.approvedBy??[];if(approvedBy.includes(user.uid))return;
    const next=[...approvedBy,user.uid];const complete=next.length>=gameSnap.data().approvalsRequired;
    tx.update(subRef,{approvedBy:next,status:complete?"approved":"pending",completedAt:complete?serverTimestamp():null});
  });
}

export async function addPhotoComment(gameId:string, submissionId:string, input:NewComment){
  const user=auth.currentUser;if(!user)throw new Error("端末認証が完了していません");
  const text=input.text.trim();if(!text||text.length>120)throw new Error("コメントは1〜120文字です");
  await setDoc(doc(collection(db,"games",gameId,"submissions",submissionId,"comments")),{
    authorUid:user.uid,participantId:input.participantId,text,createdAt:serverTimestamp(),
  });
}

export function subscribeComments(gameId:string,submissionId:string,callback:(rows:unknown[])=>void){
  return onSnapshot(collection(db,"games",gameId,"submissions",submissionId,"comments"),snap=>callback(snap.docs.map(d=>({id:d.id,...d.data()}))));
}

export async function updateGame(gameId:string,patch:Record<string,unknown>){
  await updateDoc(doc(db,"games",gameId),patch);
}
