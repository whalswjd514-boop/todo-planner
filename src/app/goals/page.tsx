import GoalsView from "@/components/GoalsView";

export const metadata = { title: "1년 목표" };

export default function GoalsPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">1년 목표</h1>
      <GoalsView />
    </>
  );
}
