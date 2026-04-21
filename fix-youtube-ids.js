/**
 * Migration: Fix YouTube embed Error 153
 * Replaces seed video youtubeId/youtubeUrl with videos that allow embedding.
 * Run: node fix-youtube-ids.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('./src/models/Video');

// Map of old broken IDs -> new embeddable IDs + URLs
const replacements = {
  'dQw4w9WgXcQ': { id: 'UF8uR6Z6KLc', url: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc' },
  'ZXsQAXx_ao0': { id: 'Ks-_Mh1QhMc', url: 'https://www.youtube.com/watch?v=Ks-_Mh1QhMc' },
  'jNQXAC9IVRw': { id: '_uQrJ0TkZlc', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc' },
  'aircAruvnKk': { id: '9bZkp7q19f0', url: 'https://www.youtube.com/watch?v=9bZkp7q19f0' },
  'PHe0bXAIuk0': { id: 'rfscVS0vtbw', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw' },
  '5qap5aO4i9A': { id: 'pTFZrZrTOqo', url: 'https://www.youtube.com/watch?v=pTFZrZrTOqo' },
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const videos = await Video.find({});
    let updated = 0;

    for (const video of videos) {
      const replacement = replacements[video.youtubeId];
      if (replacement) {
        video.youtubeId = replacement.id;
        video.youtubeUrl = replacement.url;
        await video.save();
        console.log(`  ✅ Updated "${video.title}" -> ${replacement.id}`);
        updated++;
      } else {
        console.log(`  ⏭️  Skipped "${video.title}" (youtubeId: ${video.youtubeId})`);
      }
    }

    console.log(`\nDone. ${updated} videos updated.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
