export function ErrorState({ message }: { message: string }) { return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{message}</div>; }
