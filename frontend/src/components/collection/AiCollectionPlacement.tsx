import { CheckCircle2, Sparkles } from "lucide-react";
import type { CollectionNode } from "../../types/collection";
import { CollectionPicker, findNode } from "./CollectionPicker";

export type CollectionRecommendation = {
  collectionId: string;
  confidence: number;
  reason: string;
};

export function AiCollectionPlacement({
  tree,
  selectedId,
  recommendation,
  confirmed,
  loading = false,
  disabled = false,
  onSelect,
  onRecommend,
  onConfirm,
}: {
  tree: CollectionNode[];
  selectedId: string | null;
  recommendation?: CollectionRecommendation | null;
  confirmed: boolean;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (id: string | null) => void;
  onRecommend: () => void;
  onConfirm: () => void;
}) {
  const selected = findNode(tree, selectedId);
  return (
    <section className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">归档集合 <span className="text-red-600">*</span></h3>
          <p className="mt-1 text-xs leading-5 text-muted">AI 可依据集合路径、名称和收录范围说明推荐位置；最终必须由你确认。</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-accent bg-white px-3 py-2 text-sm text-accent disabled:opacity-50" disabled={disabled || loading} onClick={onRecommend}><Sparkles className="h-4 w-4" />{loading ? "正在推荐…" : recommendation ? "重新推荐" : "AI 推荐位置"}</button>
      </div>
      <div className="mt-3"><CollectionPicker tree={tree} selectedId={selectedId} onSelect={onSelect} allowUnfiled label="请选择归档集合" disabled={disabled} /></div>
      {recommendation && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><div className="font-medium">AI 建议 · 置信度 {Math.round(recommendation.confidence * 100)}%</div><p className="mt-1 leading-6">{recommendation.reason}</p></div>}
      {selected && !confirmed && <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-white" onClick={onConfirm}><CheckCircle2 className="h-4 w-4" />确认归档到这里</button>}
      {selected && confirmed && <p className="mt-2 text-xs text-emerald-700">已确认：{selected.path}</p>}
      {selected && !selected.description && !selected.is_system && <p className="mt-2 text-xs leading-5 text-amber-700">该集合未填写收录范围说明，AI 推荐可能只依据名称和路径判断。</p>}
      {!selectedId && <p className="mt-2 text-xs text-red-600">保存前必须选择具体集合或“未归类”。</p>}
    </section>
  );
}
