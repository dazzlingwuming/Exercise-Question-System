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
  bare = false,
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
  /** 嵌在别的卡片里时去掉外框与标题，避免出现「卡中卡」。 */
  bare?: boolean;
  onSelect: (id: string | null) => void;
  onRecommend: () => void;
  onConfirm: () => void;
}) {
  const selected = findNode(tree, selectedId);

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        {!bare && (
          <div>
            <h3 className="text-sm font-semibold">归档集合 <span className="text-bad">*</span></h3>
            <p className="mt-1 text-xs leading-5 text-muted">AI 可依据集合路径、名称和收录范围说明推荐位置；最终必须由你确认。</p>
          </div>
        )}
        <button
          type="button"
          className="btn-secondary btn-sm ml-auto"
          disabled={disabled || loading}
          onClick={onRecommend}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {loading ? "正在推荐…" : recommendation ? "重新推荐" : "AI 推荐位置"}
        </button>
      </div>

      <div className={bare ? "mt-2.5" : "mt-3"}>
        <CollectionPicker
          tree={tree}
          selectedId={selectedId}
          onSelect={onSelect}
          allowUnfiled
          label="请选择归档集合"
          disabled={disabled}
        />
      </div>

      {recommendation && (
        <div className="mt-2.5 rounded-xl border border-good-border bg-good-soft p-3 text-xs leading-6 text-good">
          <div className="font-semibold">AI 建议 · 置信度 {Math.round(recommendation.confidence * 100)}%</div>
          <p className="mt-1">{recommendation.reason}</p>
        </div>
      )}

      {selected && !confirmed && (
        <button type="button" className="btn-primary btn-sm mt-2.5" onClick={onConfirm}>
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          确认归档到这里
        </button>
      )}
      {selected && confirmed && (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-good">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">已确认：{selected.path}</span>
        </p>
      )}
      {selected && !selected.description && !selected.is_system && (
        <p className="mt-2 text-xs leading-5 text-warn">该集合未填写收录范围说明，AI 推荐可能只依据名称和路径判断。</p>
      )}
      {!selectedId && <p className="mt-2 text-xs text-bad">保存前必须选择具体集合或“未归类”。</p>}
    </>
  );

  if (bare) return <div>{body}</div>;

  return <section className="rounded-2xl border border-line bg-panel-2/50 p-4">{body}</section>;
}
