import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { encryptedBase64, ivBase64, encryptedFileBase64, fileIvBase64 } = req.body;
    if (!encryptedBase64 || !ivBase64) return res.status(400).json({ error: 'Missing required fields' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    let filePath = null;

    try {
        // 1. If an image is attached, upload the encrypted blob to the 'vault' bucket
        if (encryptedFileBase64) {
            const fileName = `payload_${Date.now()}_${Math.random().toString(36).substring(7)}.enc`;
            const fileBuffer = Buffer.from(encryptedFileBase64, 'base64');
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vault')
                .upload(fileName, fileBuffer, { contentType: 'text/plain' });
                
            if (uploadError) throw uploadError;
            filePath = uploadData.path;
        }

        // 2. Save text and file path to the database
        const { data, error } = await supabase.from('secrets').insert([{ 
            encrypted_text: encryptedBase64, 
            iv_data: ivBase64,
            file_path: filePath,
            file_iv: fileIvBase64 || null
        }]).select();
        
        if (error) throw error;
        return res.status(200).json({ id: data[0].id });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Failed to securely save payload' });
    }
}
// Add this to the very bottom of api/saveSecret.js
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '5mb'
        }
    }
};
