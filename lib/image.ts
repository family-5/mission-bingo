export async function compressEvidencePhoto(file:File,maxEdge=720,quality=.68):Promise<Blob>{
  if(!file.type.startsWith("image/")) throw new Error("画像ファイルを選択してください");
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");
  if(!context) throw new Error("写真を処理できませんでした");
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
  if(!blob) throw new Error("写真を圧縮できませんでした");
  if(blob.size>520_000&&quality>.45) return compressEvidencePhoto(new File([blob],"photo.jpg",{type:"image/jpeg"}),640,.5);
  return blob;
}
