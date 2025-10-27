// Add this to your api-server.js to handle metadata updates

// POST /api/update-metadata
app.post('/api/update-metadata', async (req, res) => {
  try {
    const { coinType, imageUrl, twitter, telegram, website } = req.body;

    if (!coinType) {
      return res.status(400).json({ error: 'coinType is required' });
    }

    // Update token metadata
    await db.query(
      `UPDATE tokens SET
        image_url = COALESCE($2, image_url),
        twitter = COALESCE($3, twitter),
        telegram = COALESCE($4, telegram),
        website = COALESCE($5, website),
        updated_at = NOW()
       WHERE coin_type = $1`,
      [coinType, imageUrl || null, twitter || null, telegram || null, website || null]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ error: error.message });
  }
});
