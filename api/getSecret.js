import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // 1. Enforce strict POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = req.body;

    // 2. Validate ID existence
    if (!id) {
        return res.status(400).json({ error: 'Missing Payload ID' });
    }

    // 3. Initialize Supabase securely
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 4. Fetch the encrypted payload
        const { data, error: fetchError } = await supabase
            .from('secrets')
            .select('encrypted_text')
            .eq('id', id)
            .single();

        // If it fails or doesn't exist, it likely means it was already read/destroyed
        if (fetchError || !data) {
            return res.status(404).json({ error: 'Payload not found. It may have been destroyed or intercepted.' });
        }

        // 5. BURN AFTER READING: Immediately delete the row from the database
        const { error: deleteError } = await supabase
            .from('secrets')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Failed to delete secret after reading:', deleteError);
            // Even if delete fails (rare), we still return the payload so the user gets their message
        }

        // 6. Return the encrypted payload to the browser for local decryption
        return res.status(200).json({ encryptedBase64: data.encrypted_text });

    } catch (error) {
        console.error('Database Error during retrieval:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
