export function LoadingState({ text = "加载中" }: { text?: string }) {
  return <div className="panel rounded-lg p-6 text-sm text-muted">{text}</div>;
}
