
import yts from 'yt-search';
import axios from 'axios';

const DL_API = 'https://freeapi.pro/api/alldl';

export default {
    command: 'play',
    aliases: ['plays', 'music'],
    category: 'music',
    description: 'Search and download songs as MP3',
    usage: '.play <song name>',

    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args?.join(' ')?.trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '*🎵 Which song do you want?*\n\nUsage: .play <song name>'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, {
                text: '🔍 Searching YouTube...'
            }, { quoted: message });

            const { videos } = await yts(query);

            if (!videos?.length) {
                return sock.sendMessage(chatId, {
                    text: '❌ No results found!'
                }, { quoted: message });
            }

            const video = videos[0];

            await sock.sendMessage(chatId, {
                text:
                    `🎵 *${video.title}*\n\n` +
                    `👤 ${video.author.name}\n` +
                    `⏱️ ${video.timestamp}\n\n` +
                    '⬇️ Downloading MP3...'
            }, { quoted: message });

            const { data } = await axios.get(DL_API, {
                params: { url: video.url },
                timeout: 90000
            });

            const song = data?.mediaInfo;

            if (!data?.success || !song?.audioUrl) {
                throw new Error('Audio download URL unavailable');
            }

            // Download the actual audio file
            const audioResponse = await axios.get(song.audioUrl, {
                responseType: 'arraybuffer',
                timeout: 90000,
                maxContentLength: 25 * 1024 * 1024,
                maxBodyLength: 25 * 1024 * 1024
            });

            const audioBuffer = Buffer.from(audioResponse.data);

            if (!audioBuffer.length) {
                throw new Error('Downloaded audio is empty');
            }

            const title = (song.title || video.title)
                .replace(/[\\/:*?"<>|]/g, '')
                .slice(0, 100);

            // Send as regular audio, NOT a voice note
            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                ptt: false
            }, {
                quoted: message
            });

        } catch (err) {
            console.error(
                '[PLAY ERROR]',
                err.response?.data || err.message
            );

            await sock.sendMessage(chatId, {
                text: `❌ *Play Failed*\n\n${err.message}`
            }, { quoted: message });
        }
    }
};
