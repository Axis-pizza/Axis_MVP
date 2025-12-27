"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImagePlus, Loader2, MessageSquareWarning, X } from "lucide-react";
import { toast } from "sonner";
import { submitBugReport } from "@/app/actions/submit-bug";
// ★Contextフックをインポート
import { useBugReport } from "@/components/providers/BugReportProvider";

export function BugReportWidget() {
  // ★Contextから状態と関数を取得
  const { isOpen, close } = useBugReport();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [discord, setDiscord] = useState("");
  const [description, setDescription] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discord || !description) {
      toast.error("Please fill in required fields.");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("discord", discord);
    formData.append("description", description);
    if (screenshot) {
      formData.append("screenshot", screenshot);
    }

    const result = await submitBugReport(formData);

    setIsSubmitting(false);

    if (result.success) {
      toast.success("Bug report sent! Thank you.");
      close(); // ★Contextのcloseを使用
      setDiscord("");
      setDescription("");
      setScreenshot(null);
    } else {
      toast.error(result.message);
    }
  };

  // 開いていない時は何もレンダリングしない（トリガーボタンはBottomNav等に任せる、もしくは必要ならここに追加）
  if (!isOpen) return null;

  return (
    // z-indexを非常に高く設定 (BottomNavやSheetより上に来るように)
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
        {/* 背景クリックで閉じるためのオーバーレイ */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={close} />

        <Card className="pointer-events-auto w-full max-w-[350px] mb-6 sm:mb-0 bg-[#1E1E24] border-white/10 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 relative mx-4">
          <div className="absolute right-4 top-4">
             <button onClick={close} className="text-neutral-400 hover:text-white"><X size={18}/></button>
          </div>
          
          <div className="p-5 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquareWarning className="text-white" /> Report a Bug
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ... 中身は元のコードと同じ ... */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-300">
                  Discord (required)
                </label>
                <Input
                  placeholder="Username"
                  className="bg-[#2B2B36] border-white/5 text-white placeholder:text-neutral-500"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-300">
                  Description (required)
                </label>
                <Textarea
                  placeholder="What's the bug? What did you expect?"
                  className="bg-[#2B2B36] border-white/5 text-white placeholder:text-neutral-500 min-h-[100px] resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-[#2B4B64]/50 border-sky-500/30 text-sky-400 hover:bg-[#2B4B64] hover:text-sky-300 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={16} className="mr-2" />
                  {screenshot ? screenshot.name : "Add a screenshot"}
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit"}
                </Button>
              </div>
            </form>
          </div>
        </Card>
    </div>
  );
}