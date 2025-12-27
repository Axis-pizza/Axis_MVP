"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImagePlus, Loader2, MessageSquareWarning, X } from "lucide-react";
import { toast } from "sonner";
import { submitBugReport } from "@/app/actions/submit-bug";
import { useBugReport } from "@/components/providers/BugReportProvider";

export function BugReportWidget() {
  const { isOpen, close } = useBugReport();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      close();
      setDiscord("");
      setDescription("");
      setScreenshot(null);
    } else {
      toast.error(result.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
      <div
        className="pointer-events-auto absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      <Card className="animate-in slide-in-from-bottom-5 fade-in pointer-events-auto relative mx-4 mb-6 w-full max-w-[350px] border-white/10 bg-[#1E1E24] shadow-2xl duration-300 sm:mb-0">
        <div className="absolute top-4 right-4">
          <button onClick={close} className="text-neutral-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-xl font-bold text-white">
            <MessageSquareWarning className="text-white" /> Report a Bug
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Discord (required)</label>
              <Input
                placeholder="Username"
                className="border-white/5 bg-[#2B2B36] text-white placeholder:text-neutral-500"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Description (required)</label>
              <Textarea
                placeholder="What's the bug? What did you expect?"
                className="min-h-[100px] resize-none border-white/5 bg-[#2B2B36] text-white placeholder:text-neutral-500"
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
                className="w-full border-sky-500/30 bg-[#2B4B64]/50 text-sky-400 transition-colors hover:bg-[#2B4B64] hover:text-sky-300"
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
                className="w-full bg-[#2563EB] font-bold text-white hover:bg-[#1d4ed8]"
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
