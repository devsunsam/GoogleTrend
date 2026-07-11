import { getDraftById, getSettings } from "@/lib/db";
import { DraftEditor } from "@/components/DraftEditor";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = getDraftById(id);
  if (!draft) notFound();
  const settings = getSettings();

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300">
        ← 대시보드
      </Link>
      <h1 className="text-2xl font-semibold text-white">
        {draft.status === "published" ? "발행 글 편집" : "초안 편집"}
      </h1>
      <DraftEditor draft={draft} defaultTargetUrl={settings.blogUrl} />
    </div>
  );
}
