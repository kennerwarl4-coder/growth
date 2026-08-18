const { sigilopayFetch } = require('./_lib/sigilopay');

module.exports = async function handler(req, res) {
  const id = (req.query && req.query.id) || '';
  const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!cleanId) {
    res.status(400).json({ ok: false, error: 'id inválido' });
    return;
  }

  try {
    const result = await sigilopayFetch('/gateway/transactions?id=' + encodeURIComponent(cleanId), {
      method: 'GET',
    });

    if (!result.ok || !result.json) {
      res.status(200).json({ ok: false, status: 'UNKNOWN' });
      return;
    }

    res.status(200).json({
      ok: true,
      status: result.json.status || 'UNKNOWN',
      paid: result.json.status === 'COMPLETED',
    });
  } catch (err) {
    res.status(200).json({ ok: false, status: 'UNKNOWN' });
  }
};
