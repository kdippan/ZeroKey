import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    try {
        // 1. Fetch the secret
        const { data, error: fetchError } = await supabase
            .from('secrets')
            .select('encrypted_text')
            .eq('id', id)
            .single();

        if (fetchError || !data) {
            return res.status(404).json({ error: 'Secret not found or already destroyed.' });
        }

        // 2. IMMEDIATELY Delete the secret from the database (Burn-after-reading)
        await supabase.from('secrets').delete().eq('id', id);

        // 3. Return the encrypted payload to the browser
        return res.status(200).json({ encryptedBase64: data.encrypted_text });

    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}
