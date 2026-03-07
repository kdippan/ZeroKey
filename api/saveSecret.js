import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // 1. Enforce strict POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { encryptedBase64, ivBase64 } = req.body;

    // 2. Validate incoming data
    if (!encryptedBase64 || !ivBase64) {
        return res.status(400).json({ error: 'Missing required encryption fields' });
    }

    // 3. Initialize Supabase securely
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 4. Insert data into the 'secrets' table and return the generated UUID
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

        // 5. Send the UUID back to the frontend to build the link
        return res.status(200).json({ id: data[0].id });

    } catch (error) {
        console.error('Database Error during save:', error);
        return res.status(500).json({ error: 'Failed to securely save payload' });
    }
}
