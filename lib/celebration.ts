export const BINGO_LINES = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
  [0,6,12,18,24],[4,8,12,16,20],
] as const;

export type Celebration = {
  kind: "bingo" | "countdown" | "complete";
  title: string;
  subtitle: string;
  lineIndices: number[];
  intensity: number;
  duration: number;
};

export function completedLineIndices(done: number[]) {
  const values = new Set(done);
  return BINGO_LINES.flatMap((line, index) => line.every(cell => values.has(cell)) ? [index] : []);
}

export function bingoCount(done: number[]) { return completedLineIndices(done).length; }

export function decideCelebration(previousDone: number[], currentDone: number[]): Celebration | null {
  const previous = new Set(previousDone);
  const current = [...new Set(currentDone)];
  if (current.length <= previous.size) return null;
  const beforeLines = new Set(completedLineIndices([...previous]));
  const newLines = completedLineIndices(current).filter(index => !beforeLines.has(index));
  const remaining = 25 - current.length;

  if (current.length === 25 && previous.size < 25) {
    return {
      kind: "complete", title: "MISSION COMPLETE!!",
      subtitle: `25 / 25 COMPLETE${newLines.length ? ` ・ ＋${newLines.length} BINGO` : ""}`,
      lineIndices: newLines, intensity: 5, duration: 4600,
    };
  }
  if (newLines.length) {
    const title = newLines.length === 1 ? "BINGO!!" : newLines.length === 2 ? "DOUBLE BINGO!!" : newLines.length === 3 ? "TRIPLE BINGO!!" : `${newLines.length}× BINGO!!`;
    const countdown = remaining === 1 ? " ・ LAST MISSION!!" : remaining >= 2 && remaining <= 5 ? ` ・ あと${remaining}個！` : "";
    return { kind: "bingo", title, subtitle: `新しく${newLines.length}ライン成立！${countdown}`, lineIndices: newLines, intensity: Math.min(4, newLines.length + 1), duration: 2900 };
  }
  if (remaining >= 1 && remaining <= 5) {
    const title = remaining === 1 ? "LAST MISSION!!" : `あと${remaining}個${remaining <= 2 ? "!!" : "！"}`;
    const subtitle = remaining === 5 ? "コンプリートが見えてきた！" : remaining === 1 ? "コンプリートまであと1！" : "コンプリートへ、もうひと踏ん張り！";
    return { kind: "countdown", title, subtitle, lineIndices: [], intensity: 6 - remaining, duration: remaining === 1 ? 3000 : 2300 + (5 - remaining) * 120 };
  }
  return null;
}
