import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Missing payload ID' });
        }

        // 1. Fetch the secret to see if there is an attached file to delete
        const { data: secret, error: fetchError } = await supabase
            .from('secrets')
            .select('file_id, has_file')
            .eq('id', id)
            .single();

        // 2. If a file exists, delete it from the Supabase Storage bucket
        if (!fetchError && secret && secret.has_file && secret.file_id) {
            const { error: storageError } = await supabase
                .storage
                .from('media')
                .remove([secret.file_id]);
                
            if (storageError) console.error('Failed to delete media blob:', storageError.message);
        }

        // 3. Delete the actual database row
        const { error: deleteError } = await supabase
            .from('secrets')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return res.status(200).json({ 
            success: true, 
            message: 'Payload and media permanently destroyed' 
        });

    } catch (error) {
        console.error('Destruction error:', error.message);
        return res.status(500).json({ error: 'Failed to execute burn protocol' });
    }
}
