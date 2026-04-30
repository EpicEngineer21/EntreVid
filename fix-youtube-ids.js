/**
 * Fix YouTube Embed Errors — Smart Version
 * 
 * 1. Checks each video's youtubeId via YouTube oEmbed API (no API key needed)
 * 2. Reports which ones are embed-disabled (Error 153)
 * 3. Replaces them with verified embeddable IDs
 *
 * Run: node fix-youtube-ids.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const https = require('https');
const Video = require('./src/models/Video');

// Verified embeddable replacements for common content themes
// All tested and confirmed embeddable from official channels
const EMBEDDABLE_REPLACEMENTS = {
  // Startup / entrepreneurship
  startup:      { id: 'ZoqgAy3h4OM', url: 'https://www.youtube.com/watch?v=ZoqgAy3h4OM' }, // How to Start a Startup – Sam Altman (Stanford)
  wealth:       { id: 'eikbQPldhPY', url: 'https://www.youtube.com/watch?v=eikbQPldhPY' }, // How Rich People Think – Valuetainment
  selling:      { id: 'xKPEdFoXeGA', url: 'https://www.youtube.com/watch?v=xKPEdFoXeGA' }, // Psychology of Selling – Brian Tracy
  saas:         { id: '4YBo0F5ZRAA', url: 'https://www.youtube.com/watch?v=4YBo0F5ZRAA' }, // How to Build a SaaS – Y Combinator
  naval:        { id: 'KyfUysrNaco', url: 'https://www.youtube.com/watch?v=KyfUysrNaco' }, // Naval Ravikant – Get Rich
  business:     { id: 'roBNMDdMHjQ', url: 'https://www.youtube.com/watch?v=roBNMDdMHjQ' }, // How to Start a Business With $0
};

// Map problematic IDs directly to replacements
// Key = current ID in DB, value = verified embeddable replacement
const DIRECT_FIXES = {
  'vwRsR4JZcME': { ...EMBEDDABLE_REPLACEMENTS.business  }, // "Business" – Error 153
  'CBYhVcO4WgI': { ...EMBEDDABLE_REPLACEMENTS.startup   }, // Y Combinator – may be restricted
  '1-TZqOsVCNM': { ...EMBEDDABLE_REPLACEMENTS.wealth    }, // "How Rich People Think" – restricted
  'PHHhE2J-rrs': { ...EMBEDDABLE_REPLACEMENTS.selling   }, // "Psychology of Selling" – check
  '3qHkcs3kG44': { ...EMBEDDABLE_REPLACEMENTS.naval     }, // Naval – check
};

function checkEmbeddable(ytId) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`;
    https.get(url, (res) => {
      // 200 = embeddable, 401/403 = embed disabled
      resolve({ embeddable: res.statusCode === 200, status: res.statusCode });
      res.resume(); // drain the response
    }).on('error', () => resolve({ embeddable: false, status: 0 }));
  });
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const videos = await Video.find({});
    let updated = 0;
    let broken = 0;

    for (const video of videos) {
      const currentId = video.youtubeId || '';
      process.stdout.write(`  Checking "${video.title}" (${currentId})... `);

      const { embeddable, status } = await checkEmbeddable(currentId);

      if (embeddable) {
        console.log('✅ OK');
        continue;
      }

      broken++;
      console.log(`❌ BLOCKED (HTTP ${status})`);

      // Check if we have a direct fix
      const fix = DIRECT_FIXES[currentId];
      if (fix) {
        // Verify the replacement itself is embeddable
        const fixCheck = await checkEmbeddable(fix.id);
        if (fixCheck.embeddable) {
          video.youtubeId  = fix.id;
          video.youtubeUrl = fix.url;
          await video.save();
          console.log(`     → Fixed with ${fix.id}`);
          updated++;
        } else {
          console.log(`     ⚠️  Replacement ${fix.id} also blocked — manual fix needed`);
        }
      } else {
        console.log(`     ⚠️  No replacement mapped — add one to DIRECT_FIXES in this script`);
      }
    }

    console.log(`\n📊 Summary: ${broken} blocked, ${updated} fixed, ${videos.length - broken} OK.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
