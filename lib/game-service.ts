import {
  Bytes, collection, doc, getDoc, onSnapshot, runTransaction,
  serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase-client";

export type Participant = { id: string; name: string; color: string };
export type Mission = { id: number; text: string };
export type Game = {
  id: string; title: string; ownerUid: string; approvalsRequired: number;
  participants: Participant[]; missions: Mission[]; startsAt?: string; endsAt?: string;
  announcement?: string; bingoReward?: number; completeReward?: number;
};
export type Submission = {
  id: string; participantId: string; authorUid: string; missionId: number;
  photoBytes?: Bytes; photoContentType: string; caption: string;
  status: "pending" | "approved"; approvedBy: string[];
  createdAt?: { seconds: number }; completedAt?: { seconds: number } | null;
};
export type PhotoComment = {
  id: string; authorUid: string; participantId: string; text: string;
  createdAt?: { seconds: number };
};

export async function createGame(input: Omit<Game, "id" | "ownerUid">) {
  const user = auth.currentUser;
  if (!user) throw new Error("認証が完了していません");
  const ref = doc(collection(db, "games"));
  await setDoc(ref, { ...input, ownerUid: user.uid, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getGame(gameId: string) {
  const snap = await getDoc(doc(db, "games", gameId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null;
}

export function subscribeGame(gameId: string, callback: (game: Game | null) => void) {
  return onSnapshot(doc(db, "games", gameId), snap =>
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null));
}

export function subscribeSubmissions(gameId: string, callback: (rows: Submission[]) => void) {
  return onSnapshot(collection(db, "games", gameId, "submissions"), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission))));
}

export async function submitMission(gameId: string, participantId: string, missionId: number, photo: Blob, caption: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("認証が完了していません");
  if (photo.size > 520_000) throw new Error("写真サイズが大きすぎます");
  const submissionId = `${participantId}_${missionId}`;
  const photoBytes = Bytes.fromUint8Array(new Uint8Array(await photo.arrayBuffer()));
  await setDoc(doc(db, "games", gameId, "submissions", submissionId), {
    participantId, authorUid: user.uid, missionId, photoBytes,
    photoContentType: "image/jpeg", caption: caption.slice(0, 200),
    status: "pending", approvedBy: [], createdAt: serverTimestamp(), completedAt: null,
  });
}

export function photoBytesToUrl(value: unknown) {
  if (!(value instanceof Bytes)) return "";
  const bytes = value.toUint8Array();
  return URL.createObjectURL(new Blob([bytes.slice().buffer], { type: "image/jpeg" }));
}

export async function approveMission(gameId: string, submissionId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("認証が完了していません");
  const gameRef = doc(db, "games", gameId);
  const subRef = doc(db, "games", gameId, "submissions", submissionId);
  await runTransaction(db, async tx => {
    const [gameSnap, subSnap] = await Promise.all([tx.get(gameRef), tx.get(subRef)]);
    if (!gameSnap.exists() || !subSnap.exists()) throw new Error("申請が見つかりません");
    const sub = subSnap.data();
    if (sub.authorUid === user.uid) throw new Error("自分の申請は承認できません");
    const approvedBy: string[] = sub.approvedBy ?? [];
    if (approvedBy.includes(user.uid)) return;
    const next = [...approvedBy, user.uid];
    const complete = next.length >= gameSnap.data().approvalsRequired;
    tx.update(subRef, { approvedBy: next, status: complete ? "approved" : "pending", completedAt: complete ? serverTimestamp() : null });
  });
}

export async function addPhotoComment(gameId: string, submissionId: string, participantId: string, textValue: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("認証が完了していません");
  const text = textValue.trim();
  if (!text || text.length > 120) throw new Error("コメントは1〜120文字で入力してください");
  await setDoc(doc(collection(db, "games", gameId, "submissions", submissionId, "comments")), {
    authorUid: user.uid, participantId, text, createdAt: serverTimestamp(),
  });
}

export function subscribeComments(gameId: string, submissionId: string, callback: (rows: PhotoComment[]) => void) {
  return onSnapshot(collection(db, "games", gameId, "submissions", submissionId, "comments"), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as PhotoComment))));
}

export async function updateGame(gameId: string, patch: Record<string, unknown>) {
  await updateDoc(doc(db, "games", gameId), patch);
}
