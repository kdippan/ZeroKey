import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests for the status ping
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing database credentials in Vercel settings.");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Perform a microscopic query just to verify the database is awake and reachable
        const { error } = await supabase
            .from('secrets')
            .select('id')
            .limit(1);

        if (error) throw error;

        // If it reaches here, Vercel is up AND Supabase is up!
        return res.status(200).json({ 
            status: 'Operational', 
            database: 'Connected',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Health check failed:", error.message);
        return res.status(500).json({ 
            status: 'Degraded', 
            error: "Database unreachable" 
        });
    }
}
