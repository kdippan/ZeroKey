import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { encryptedBase64, ivBase64 } = req.body;

    if (!encryptedBase64 || !ivBase64) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Initialize Supabase using Vercel's Environment Variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 3. Insert the encrypted data into your 'secrets' table
        const { data, error } = await supabase
            .from('secrets')
            .insert([
                { 
                    encrypted_text: encryptedBase64, 
                    iv_data: ivBase64 
                }
            ])
            .select();

        if (error) throw error;

        // 4. Send the generated database ID back to your frontend
        return res.status(200).json({ id: data[0].id });

    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Failed to save secret' });
    }
}
