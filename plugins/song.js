
import axios from 'axios';
import yts from 'yt-search';

const DL_API = 'https://freeapi.pro/api/alldl';

export default {
    command: 'song',
    aliases: ['music', 'audio', 'mp4', 'video'],
    category: 'music',
    description: 'Download YouTube video as MP4',
    usage: '.song <song name | youtube link>',

    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '🎬 *Video Downloader*\n\nUsage:\n.song <video name | YouTube link>'
            }, { quoted: message });
        }

        try {
            let video;

            if (/youtube\.com|youtu\.be/i.test(query)) {
                video = { url: query };
            } else {
                const { videos } = await yts(query);

                if (!videos?.length) {
                    return sock.sendMessage(chatId, {
                        text: '❌ No results found.'
                    }, { quoted: message });
                }

                video = videos[0];
            }

            await sock.sendMessage(chatId, {
                text: '⏳ *Processing video...*'
            }, { quoted: message });

            const { data } = await axios.get(DL_API, {
                params: { url: video.url },
                timeout: 90000
            });

            const media = data?.mediaInfo;

            if (!data?.success || !media?.videoUrl) {
                throw new Error('API did not return an MP4 download URL');
            }

            await sock.sendMessage(chatId, {
                video: { url: media.videoUrl },
                mimetype: 'video/mp4',
                fileName: `${media.title || 'video'}.mp4`,
                caption:
                    `🎬 *${media.title || video.title || 'Video'}*\n` +
                    `👤 ${media.author || video.author?.name || 'Unknown'}`,
            }, { quoted: message });

        } catch (err) {
            console.error(
                'Video plugin error:',
                err.response?.data || err.message
            );

            await sock.sendMessage(chatId, {
                text: `❌ *Failed:* ${err.message}`
            }, { quoted: message });
        }
    }
};
