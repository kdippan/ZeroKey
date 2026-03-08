import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    const { encryptedBase64, ivBase64, encryptedFileBase64, fileIvBase64 } = req.body;
    if (!encryptedBase64 || !ivBase64) return res.status(400).json({ error: 'Missing required fields' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    let filePath = null;

    try {
        // 1. Process Media Upload
        if (encryptedFileBase64) {
            const fileName = `payload_${Date.now()}_${Math.random().toString(36).substring(7)}.enc`;
            const fileBuffer = Buffer.from(encryptedFileBase64, 'base64');
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vault')
                .upload(fileName, fileBuffer, { contentType: 'application/octet-stream' });
                
            // If Storage fails, send the EXACT error back to the phone
            if (uploadError) {
                return res.status(403).json({ error: `Supabase Storage Error: ${uploadError.message}` });
            }
            filePath = uploadData.path;
        }

        // 2. Process Database Insert
        const { data, error } = await supabase.from('secrets').insert([{ 
            encrypted_text: encryptedBase64, 
            iv_data: ivBase64,
            file_path: filePath,
            file_iv: fileIvBase64 || null
        }]).select();
        
        // If Database fails, send the EXACT error back to the phone
        if (error) {
            return res.status(403).json({ error: `Supabase Database Error: ${error.message}` });
        }
        
        return res.status(200).json({ id: data[0].id });
        
    } catch (error) {
        return res.status(500).json({ error: `Server Crash: ${error.message}` });
    }
}
