import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all base64 images (not yet migrated)
    const { data: rows, error } = await supabase
      .from("vocab_images")
      .select("word, image_base64")
      .not("image_base64", "like", "https://%")
      .limit(5); // Process 5 at a time (images are ~1.5MB each)

    if (error) throw error;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ message: "No base64 images to migrate", migrated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let migrated = 0;
    let failed = 0;
    const results: string[] = [];

    for (const row of rows) {
      try {
        const b64 = row.image_base64.replace(/^data:image\/\w+;base64,/, "");
        const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const filename = row.word.toLowerCase()
          .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
          .replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") + ".png";

        const { error: uploadError } = await supabase.storage
          .from("vocab-images")
          .upload(filename, binary, { contentType: "image/png", upsert: true });

        if (uploadError) {
          results.push(`FAIL upload ${row.word}: ${uploadError.message}`);
          failed++;
          continue;
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/vocab-images/${filename}`;

        const { error: updateError } = await supabase
          .from("vocab_images")
          .update({ image_base64: publicUrl })
          .eq("word", row.word);

        if (updateError) {
          results.push(`FAIL update ${row.word}: ${updateError.message}`);
          failed++;
        } else {
          results.push(`OK ${row.word}`);
          migrated++;
        }
      } catch (e) {
        results.push(`ERROR ${row.word}: ${e.message}`);
        failed++;
      }
    }

    return new Response(JSON.stringify({ migrated, failed, total: rows.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
