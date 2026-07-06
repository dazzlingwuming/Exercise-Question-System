import { useState } from "react";

const REASONS = ["题目重复", "标准答案明显错误且不想保留", "题目格式损坏", "不属于当前题库范围", "其他"];

export function DeleteQuestionDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reasonType, setReasonType] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  if (!open) return null;
  const reason = `${reasonType}${detail.trim() ? `：${detail.trim()}` : ""}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold">确认删除这道题吗？</h2>
        <p className="mt-2 text-sm leading-6 text-muted">删除后该题不会再出现在练习和统计中，但历史答题记录仍会保留。</p>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm text-muted">删除原因</span>
          <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={reasonType} onChange={(event) => setReasonType(event.target.value)}>
            {REASONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <textarea className="mt-3 min-h-24 w-full rounded-md border border-line px-3 py-2" value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="可补充重复于哪道题或具体原因" />
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border border-line bg-white px-4 py-2 text-sm" onClick={onCancel}>取消</button>
          <button className="rounded-md bg-red-600 px-4 py-2 text-sm text-white" onClick={() => onConfirm(reason)}>确认删除</button>
        </div>
      </div>
    </div>
  );
}
