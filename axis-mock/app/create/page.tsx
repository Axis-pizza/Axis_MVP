import  CreateWithAI  from "@/app/create/CreateVaultForm";
import { AppLayout } from "@/components/layout/AppLayout";

export default function CreatePage() {
  return (
    <AppLayout>
    <div className="space-y-8 pb-20">
      <div className="mb-8 flex flex-col gap-2"></div>

      <CreateWithAI />
    </div>
    </AppLayout>
  );
}
