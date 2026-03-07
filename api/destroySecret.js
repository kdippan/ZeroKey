import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // 1. Enforce strict POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = req.body;

    // 2. Validate incoming data
    if (!id) {
        return res.status(400).json({ error: 'Missing Payload ID' });
    }

    // 3. Initialize Supabase securely using Vercel environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 4. THE KILL SWITCH: Instantly delete the row matching the ID
        // We do not read it or return it; we just wipe it.
        const { error } = await supabase
            .from('secrets')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 5. Confirm destruction to the frontend
        return res.status(200).json({ success: true, message: 'Payload permanently wiped.' });

    } catch (error) {
        console.error('Database Error during kill switch execution:', error);
        return res.status(500).json({ error: 'Server error during deletion' });
    }
}
