import { CreateWithAI } from "@/app/create/CreateVaultForm";

export default function CreatePage() {
  return (
    <div className="space-y-8 pb-20">
      <div className="mb-8 flex flex-col gap-2"></div>

      <CreateWithAI />
    </div>
  );
}
