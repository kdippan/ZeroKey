export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { type, table, schema, record, old_record } = req.body;
        const data = record || old_record;
        
        if (!data) return res.status(400).json({ error: 'No data found' });

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

        if (!botToken || !chatId) return res.status(500).json({ error: 'Server config error' });

        let message = '';

        if (table === 'secrets') {
            if (type === 'INSERT') {
                message = `🚨 📦 *New Secret Payload Created*\n\n*ID:* \`${data.id}\`\n*Protected:* ${data.has_pin ? 'Yes 🔒' : 'No 🔓'}\n\n🔗 *Direct Link:*\nhttps://zerokey.vercel.app/view?id=${data.id}`;
            } else if (type === 'DELETE') {
                message = `💥 📦 *Secret Payload Destroyed*\n(Burned after reading)\n*ID:* \`${data.id}\``;
            }
        } else if (table === 'chat_rooms') {
            const linkId = data.custom_alias || data.id;
            if (type === 'INSERT') {
                message = `🚨 🏠 *New Chat Room Created*\n\n*Name:* \`${data.room_name}\`\n*Protected:* ${data.is_protected ? 'Yes 🔒' : 'No 🔓'}\n\n🔗 *Direct Link:*\nhttps://zerokey.vercel.app/chat#${linkId}`;
            } else if (type === 'DELETE') {
                message = `💥 🏠 *Chat Room Destroyed*\n(Timer expired)\n*Name:* \`${data.room_name}\``;
            }
        } else if (schema === 'auth' && table === 'users') {
            if (type === 'INSERT') {
                message = `👤 *New User Signup*\n*Email:* \`${data.email}\``;
            } else {
                return res.status(200).json({ ignored: true });
            }
        } else if (schema === 'storage' && table === 'objects') {
            if (data.name.endsWith('/.emptyFolderPlaceholder')) return res.status(200).json({ ignored: true });
            
            if (type === 'INSERT') {
                const sizeMB = (data.metadata?.size / (1024 * 1024)).toFixed(2);
                message = `📁 *New File Uploaded*\n*Bucket:* \`${data.bucket_id}\`\n*File:* \`${data.name}\`\n*Size:* ${sizeMB} MB`;
            } else if (type === 'DELETE') {
                message = `🗑️ *File Deleted*\n*Bucket:* \`${data.bucket_id}\`\n*File:* \`${data.name}\``;
            }
        } else {
            return res.status(200).json({ ignored: true });
        }

        message += `\n\n*Time:* ${new Date().toUTCString()}`;

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
        });

        if (!response.ok) throw new Error("Telegram API Error");

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Alert Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
