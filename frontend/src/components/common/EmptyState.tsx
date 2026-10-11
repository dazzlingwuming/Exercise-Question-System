import { BookOpen } from "lucide-react";
export function EmptyState({ text }: { text: string }) { return <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted"><BookOpen className="mb-3 h-8 w-8 text-blue-300" />{text}</div>; }
