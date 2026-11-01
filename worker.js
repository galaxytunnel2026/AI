/**
 * Cloudflare Worker Backend for Aetheris Personal AI Agent
 * Supports Multi-Provider (Gemini + Groq) and 100% Free Image Gen (Pollinations/FLUX)
 */

export interface Env {
  GEMINI_API_KEY: string;
  BACKUP_GEMINI_KEY?: string;
  GROQ_API_KEY?: string;
  OWNER_EMAIL?: string;
  OWNER_UID?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const corsHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    };

    // 1. Session check
    if (url.pathname === "/api/auth/session") {
      return new Response(
        JSON.stringify({
          owner: {
            isAuthenticated: true,
            email: env.OWNER_EMAIL || "owner@aetheris.local",
            uid: env.OWNER_UID || "owner_uid_777",
          },
        }),
        { headers: corsHeaders }
      );
    }

    // 2. Free Image Generation API
    if (url.pathname === "/api/ai/image-generate" && request.method === "POST") {
      const body: any = await request.json().catch(() => ({}));
      const prompt = body.prompt || "futuristic landscape";
      const clean = encodeURIComponent(prompt.trim());
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${clean}?width=1024&height=1024&model=flux&nologo=true&seed=${seed}`;
      
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl,
          file: {
            id: `img_${Date.now()}`,
            name: `flux_art_${Date.now()}.jpg`,
            type: "image",
            size: "1.5 MB",
            createdAt: new Date().toISOString(),
            content: imageUrl,
          }
        }),
        { headers: corsHeaders }
      );
    }

    // 3. Agent Task Run
    if (url.pathname === "/api/agent/run-task" && request.method === "POST") {
      try {
        const body: any = await request.json().catch(() => ({}));
        const instruction = body.instruction || "";
        const taskType = body.taskType || "Chat";
        const taskId = `task_${Date.now()}`;

        const trimmed = instruction.trim().toLowerCase();
        const pureGreetings = ["hi", "hello", "hey", "mingalarbar", "greetings", "sup", "မင်္ဂလာပါ", "မင်္ဂလာပါရှင်", "မင်္ဂလာပါခင်ဗျာ", "hi!", "hello!"];
        if (pureGreetings.includes(trimmed)) {
          return new Response(
            JSON.stringify({
              success: true,
              task: { id: taskId, title: instruction, status: "completed" },
              file: null,
              result: "Mingalarbar! မင်္ဂလာပါရှင်။ Aetheris Personal AI Agent မှ ကြိုဆိုပါတယ်။ ဘာများ ကူညီဆောင်ရွက်ပေးရမလဲရှင်။\n\n- သုတေသန ရှာဖွေခြင်း\n- AI ပုံဆွဲပေးခြင်း (Free FLUX Image Gen)\n- စကားပြောခြင်းနှင့် မေးခွန်းများ",
            }),
            { headers: corsHeaders }
          );
        }

        // Image Intent
        if (taskType === "Image" || trimmed.includes("ဆွဲပေး") || trimmed.includes("ပုံဆွဲ") || trimmed.startsWith("draw ")) {
          const clean = encodeURIComponent(instruction.replace(/ဆွဲပေးပါ|ပုံဆွဲပေးပါ|ပုံဆွဲ|^draw\s+/gi, "").trim() || "aesthetic nature artwork");
          const seed = Math.floor(Math.random() * 1000000);
          const imageUrl = `https://image.pollinations.ai/prompt/${clean}?width=1024&height=1024&model=flux&nologo=true&seed=${seed}`;
          return new Response(
            JSON.stringify({
              success: true,
              task: { id: taskId, title: instruction, status: "completed" },
              imageUrl,
              file: {
                id: `img_${Date.now()}`,
                name: `art_${Date.now()}.jpg`,
                type: "image",
                size: "1.5 MB",
                createdAt: new Date().toISOString(),
                content: imageUrl,
              },
              result: `သင့်အတွက် AI ရုပ်ပုံကို အခမဲ့ FLUX မော်ဒယ်ဖြင့် ဖန်တီးပေးလိုက်ပါပြီရှင်။`,
            }),
            { headers: corsHeaders }
          );
        }

        // Real-time Date
        const now = new Date();
        const yangonDate = now.toLocaleDateString("en-US", { timeZone: "Asia/Yangon", year: "numeric", month: "long", day: "numeric", weekday: "long" });
        const yangonTime = now.toLocaleTimeString("en-US", { timeZone: "Asia/Yangon", hour: "2-digit", minute: "2-digit" });
        const systemPrompt = `You are Aetheris, a private personal AI agent.
Real-world Live Context: Current Date: ${yangonDate}, Time: ${yangonTime} (Timezone: Asia/Yangon).
Answer warmly in Burmese or English.`;

        let textOutput = "";

        // Try Groq first if GROQ_API_KEY is present
        if (env.GROQ_API_KEY && taskType === "Chat") {
          try {
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: instruction }
                ],
              }),
            });
            const groqData: any = await groqRes.json();
            if (groqData.choices?.[0]?.message?.content) {
              textOutput = groqData.choices[0].message.content;
            }
          } catch (e) {
            // fallback to Gemini
          }
        }

        // Gemini Primary or Backup
        if (!textOutput) {
          const key = env.GEMINI_API_KEY || env.BACKUP_GEMINI_KEY;
          if (!key) throw new Error("No AI API Keys configured.");

          const model = taskType === "Research" ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
          const payload: any = {
            contents: [{ parts: [{ text: instruction }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
          };
          if (taskType === "Research") {
            payload.tools = [{ googleSearch: {} }];
          }

          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const geminiData: any = await geminiRes.json();
          textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Response generated.";
        }

        return new Response(
          JSON.stringify({
            success: true,
            task: { id: taskId, title: instruction.slice(0, 50), status: "completed" },
            file: null,
            result: textOutput,
          }),
          { headers: corsHeaders }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ success: false, error: err.message || "Failed" }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
  },
};
