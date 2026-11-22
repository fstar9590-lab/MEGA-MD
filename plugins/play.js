
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
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '*Which song do you want to play?*\nUsage: .play <song name>'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(chatId, {
                text: '🔍 *Searching YouTube...*'
            }, { quoted: message });

            const { videos } = await yts(query);

            if (!videos?.length) {
                return sock.sendMessage(chatId, {
                    text: '❌ *No results found!*'
                }, { quoted: message });
            }

            const video = videos[0];

            await sock.sendMessage(chatId, {
                text: `✅ *Found:* ${video.title}\n` +
                    `⏱️ ${video.timestamp}\n` +
                    `👤 ${video.author.name}\n\n` +
                    '⏳ *Downloading MP3...*'
            }, { quoted: message });

            const { data } = await axios.get(DL_API, {
                params: { url: video.url },
                timeout: 90000
            });

            const song = data?.mediaInfo;

            if (!data?.success || !song?.audioUrl) {
                throw new Error('API did not return an audio URL');
            }

            await sock.sendMessage(chatId, {
                audio: { url: song.audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${song.title || video.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: song.title || video.title,
                        body: song.author || video.author.name,
                        thumbnailUrl: song.thumbnail || video.thumbnail,
                        mediaType: 2,
                        sourceUrl: video.url
                    }
                }
            }, { quoted: message });

        } catch (err) {
            console.error('Play error:', err.response?.data || err.message);

            await sock.sendMessage(chatId, {
                text: `❌ *Play Failed*\n\n${err.response?.data?.message || err.message}`
            }, { quoted: message });
        }
    }
};
