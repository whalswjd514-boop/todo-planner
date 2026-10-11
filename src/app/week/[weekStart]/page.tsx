import { Suspense } from "react";
import WeekView from "@/components/WeekView";

export const metadata = { title: "주간 계획" };

async function WeekContent({ params }: { params: Promise<{ weekStart: string }> }) {
  const { weekStart } = await params;
  return <WeekView weekStart={weekStart} />;
}

export default function WeekPage({ params }: { params: Promise<{ weekStart: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">불러오는 중...</p>}>
      <WeekContent params={params} />
    </Suspense>
  );
}
