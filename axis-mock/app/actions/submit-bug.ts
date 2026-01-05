"use server";

export async function submitBugReport(formData: FormData) {
  const discord = formData.get("discord") as string;
  const description = formData.get("description") as string;

  if (!discord || !description) {
    return { success: false, message: "Discord ID and Description are required." };
  }

  try {
    // Utilize axis-api (Cloudflare Worker) to send the email via Email Routing
    // Make sure NEXT_PUBLIC_AXIS_API_URL is defined in your environment variables
    const apiUrl = process.env.NEXT_PUBLIC_AXIS_API_URL || "http://localhost:8787";

    const response = await fetch(`${apiUrl}/submit-bug`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ discord, description }),
    });

    const result = await response.json() as { success: boolean; message?: string; error?: string };

    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error || "Unknown server error");
    }

    return { success: true, message: "Report sent successfully!" };

  } catch (error: unknown) {
    console.error("Bug Report Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send report.";
    return { success: false, message: errorMessage };
  }
}
