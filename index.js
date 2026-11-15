const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

console.log("Hunter Clip Bot Started");

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🔥 CLIP-HUNTER BOT Ready Hai!\n\nBas YouTube Link bhejo, mai 3 Clips bana dunga.\n\nExample:\nhttps://youtu.be/xyz");
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";
  if (!text.includes('youtube.com') && !text.includes('youtu.be')) return;
  if (text.startsWith('/')) return;

  bot.sendMessage(chatId, "🔥 Link mil gaya! 3 Clips bana raha hu... 2-3 min lagega.");

  const videoId = Date.now();
  const workDir = path.join(__dirname, 'temp_' + videoId);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

  try {
    bot.sendMessage(chatId, "📥 Video Download ho raha hai...");
    await new Promise((res, rej) => {
      exec(`npx yt-dlp -f "mp4[height<=720]" -o "${workDir}/main.mp4" "${text}"`, (err) => err ? rej(err) : res());
    });

    let duration = 180;
    await new Promise((res) => {
      exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${workDir}/main.mp4"`, (e, out) => {
        if (out) duration = parseFloat(out);
        res();
      });
    });

    const starts = [Math.floor(duration*0.10), Math.floor(duration*0.45), Math.floor(duration*0.70)];
    for (let i=0; i<3; i++) {
      const clipTime = 40;
      const start = starts[i];
      const clipPath = path.join(workDir, `clip${i+1}.mp4`);
      const thumbPath = path.join(workDir, `thumb${i+1}.jpg`);
      bot.sendMessage(chatId, `✂️ Clip ${i+1} bana raha hu... (${clipTime} sec)`);
      await new Promise((res, rej) => {
        const cmd = `ffmpeg -y -ss ${start} -i "${workDir}/main.mp4" -t ${clipTime} -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" -c:a aac -c:v libx264 -preset veryfast "${clipPath}"`;
        exec(cmd, (err) => err ? rej(err) : res());
      });
      exec(`ffmpeg -y -ss 2 -i "${clipPath}" -vframes 1 "${thumbPath}"`, async () => {
        await bot.sendPhoto(chatId, thumbPath, { caption: `🖼️ Clip ${i+1} Thumbnail` }).catch(()=>{});
      });
      await bot.sendVideo(chatId, clipPath, {
        caption: `🔥 Clip ${i+1} (${clipTime} sec)\n\n📝 Title: Viral Best Moment 🔥\n#️⃣ #shorts #viral #trending`
      });
    }
    bot.sendMessage(chatId, "✅ Ho Gaya! 3 Clips mil gaye.");
    fs.rmSync(workDir, { recursive: true, force: true });
  } catch (e) {
    console.log(e);
    bot.sendMessage(chatId, "❌ Error aa gaya: " + e.message);
  }
});
