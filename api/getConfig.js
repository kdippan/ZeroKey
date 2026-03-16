// api/getConfig.js
export default function handler(req, res) {
    // Only pass the PUBLIC Anon key, never the Service Role key
    res.status(200).json({
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY
    });
}
