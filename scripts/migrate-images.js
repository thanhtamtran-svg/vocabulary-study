// One-time script: migrate base64 images from DB to Supabase Storage
// Run: node scripts/migrate-images.js

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_KEY env var first');
  console.error('Run: npx supabase secrets list  (to find it)');
  console.error('Then: SUPABASE_SERVICE_KEY=xxx node scripts/migrate-images.js');
  process.exit(1);
}

async function migrate() {
  // Get all base64 images
  const res = await fetch(
    SUPABASE_URL + '/rest/v1/vocab_images?image_base64=not.like.https://*&select=word,image_base64&limit=200',
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
  );
  const rows = await res.json();
  console.log('Found', rows.length, 'base64 images to migrate');

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // Extract base64 data
      const b64 = row.image_base64.replace(/^data:image\/\w+;base64,/, '');
      const binary = Buffer.from(b64, 'base64');
      const filename = row.word.replace(/[^a-zäöüß0-9]/gi, '_').toLowerCase() + '.png';

      // Upload to Storage
      const uploadRes = await fetch(
        SUPABASE_URL + '/storage/v1/object/vocab-images/' + filename,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'image/png',
            'x-upsert': 'true'
          },
          body: binary
        }
      );

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        console.error('Upload failed for', row.word, ':', err);
        failed++;
        continue;
      }

      // Update DB row with public URL
      const publicUrl = SUPABASE_URL + '/storage/v1/object/public/vocab-images/' + filename;
      const updateRes = await fetch(
        SUPABASE_URL + '/rest/v1/vocab_images?word=eq.' + encodeURIComponent(row.word),
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ image_base64: publicUrl })
        }
      );

      if (updateRes.ok) {
        migrated++;
        console.log('Migrated:', row.word, '→', publicUrl);
      } else {
        console.error('Update failed for', row.word);
        failed++;
      }

      // Rate limit: wait 200ms between uploads
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error('Error migrating', row.word, ':', e.message);
      failed++;
    }
  }

  console.log('\nDone! Migrated:', migrated, 'Failed:', failed);
}

migrate();
