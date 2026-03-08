import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing Payload ID' });

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    try {
        // Fetch to see if there is an associated file to wipe
        const { data } = await supabase.from('secrets').select('file_path').eq('id', id).single();
        
        if (data && data.file_path) {
            await supabase.storage.from('vault').remove([data.file_path]);
        }

        // Wipe the text payload
        const { error } = await supabase.from('secrets').delete().eq('id', id);
        if (error) throw error;
        
        return res.status(200).json({ success: true, message: 'Payload permanently wiped.' });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Server error during deletion' });
    }
}
