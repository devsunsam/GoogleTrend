import { SettingsForm } from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-semibold text-white">설정</h1>
        <p className="mt-2 text-sm text-neutral-400">
          블로그 연동, 트렌드 수집 옵션을 관리합니다.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
