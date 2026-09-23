import fs from "node:fs";
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1);
}
const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { data, error } = await supabase.auth.signInWithOtp({
  email: "lucapittinari21@gmail.com",
  options: { emailRedirectTo: "https://validador-ideas-lovat.vercel.app/auth/callback" },
});

console.log("data:", data);
console.log("error:", error);
