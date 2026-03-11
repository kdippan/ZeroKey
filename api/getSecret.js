import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ error: 'Missing payload ID' });
        }

        const { data, error } = await supabase
            .from('secrets')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Vault destroyed or not found' });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Retrieval error:', error.message);
        return res.status(500).json({ error: 'Failed to retrieve payload' });
    }
}
