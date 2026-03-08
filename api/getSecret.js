import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    try {
        const { data, error: fetchError } = await supabase.from('secrets').select('*').eq('id', id).single();
        if (fetchError || !data) return res.status(404).json({ error: 'Payload not found.' });

        let encryptedFileBase64 = null;

        if (data.file_path) {
            const { data: fileData, error: downloadError } = await supabase.storage.from('vault').download(data.file_path);
            if (!downloadError) {
                const buffer = await fileData.arrayBuffer();
                encryptedFileBase64 = Buffer.from(buffer).toString('base64');
            }
            await supabase.storage.from('vault').remove([data.file_path]);
        }

        await supabase.from('secrets').delete().eq('id', id);

        return res.status(200).json({ 
            encryptedBase64: data.encrypted_text,
            encryptedFileBase64: encryptedFileBase64,
            fileIvBase64: data.file_iv
        });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
