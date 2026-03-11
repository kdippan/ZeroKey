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

        const { 
            encrypted_payload, 
            iv, 
            salt, 
            has_pin, 
            has_file, 
            file_id, 
            geo_lat, 
            geo_lng 
        } = req.body;

        if (!encrypted_payload || !iv || !salt) {
            return res.status(400).json({ error: 'Missing critical cryptographic parameters' });
        }

        const { data, error } = await supabase
            .from('secrets')
            .insert([{
                encrypted_payload,
                iv,
                salt,
                has_pin: has_pin || false,
                has_file: has_file || false,
                file_id: file_id || null,
                geo_lat: geo_lat || null,
                geo_lng: geo_lng || null
            }])
            .select('id')
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, id: data.id });

    } catch (error) {
        console.error('Save error:', error.message);
        return res.status(500).json({ error: 'Failed to encrypt and store payload' });
    }
}
