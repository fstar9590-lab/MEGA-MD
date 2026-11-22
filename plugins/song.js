
import axios from 'axios';
import yts from 'yt-search';

const DL_API = 'https://freeapi.pro/api/alldl';
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60 MB

export default {
    command: 'song',
    aliases: ['audio', 'mp4', 'video'],
    category: 'music',
    description: 'Download YouTube video as MP4',
    usage: '.song <song name | YouTube link>',

    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const query = args?.join(' ')?.trim();

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
                text: '⏳ Downloading MP4 video...'
            }, { quoted: message });

            const { data } = await axios.get(DL_API, {
                params: { url: video.url },
                timeout: 90000
            });

            const media = data?.mediaInfo;

            if (!data?.success || !media?.videoUrl) {
                throw new Error('API did not return an MP4 URL');
            }

            // Download MP4 into memory
            const response = await axios.get(media.videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: MAX_VIDEO_SIZE,
                maxBodyLength: MAX_VIDEO_SIZE
            });

            const videoBuffer = Buffer.from(response.data);

            if (!videoBuffer.length) {
                throw new Error('Downloaded video is empty');
            }

            if (videoBuffer.length > MAX_VIDEO_SIZE) {
                throw new Error('Video exceeds the 60 MB limit');
            }

            const title = (media.title || video.title || 'video')
                .replace(/[\\/:*?"<>|]/g, '')
                .slice(0, 100);

            // Send as a standard WhatsApp MP4 video
            await sock.sendMessage(chatId, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`,
                gifPlayback: false,
                ptv: false,
                caption:
                    `🎬 *${media.title || video.title || 'Video'}*\n` +
                    `👤 ${media.author || video.author?.name || 'Unknown'}`
            }, { quoted: message });

        } catch (err) {
            console.error(
                '[SONG VIDEO ERROR]',
                err.response?.data || err.message
            );

            await sock.sendMessage(chatId, {
                text: `❌ *Video Download Failed*\n\n${err.message}`
            }, { quoted: message });
        }
    }
};
