const { sigilopayFetch, generateIdentifier, onlyDigits } = require('./_lib/sigilopay');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');

    const amountRaw = String(body.amount || '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const amount = parseFloat(amountRaw);

    if (!amount || amount <= 0) {
      res.status(400).json({ ok: false, error: 'Valor inválido.' });
      return;
    }

    const identifier = generateIdentifier();

    const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const callbackUrl = `${proto}://${host}/api/webhook`;

    const client = {
      name: (body.client_name || '').trim() || 'Cliente Growth',
      email: (body.client_email || '').trim() || 'sememail@growth.com',
      phone: onlyDigits(body.client_phone) || '00000000000',
      document: onlyDigits(body.client_document) || '00000000000',
    };

    const payload = {
      identifier,
      amount,
      client,
      products: [
        {
          id: 'kit-trio-growth',
          name: 'Kit Trio Growth: Whey Protein 80% + Creatina Monohidratada + Pré-Treino Haze Hardcore',
          quantity: 1,
          price: amount,
        },
      ],
      callbackUrl,
    };

    const result = await sigilopayFetch('/gateway/pix/receive', {
      method: 'POST',
      body: payload,
    });

    if (!result.ok || !result.json) {
      res.status(result.status || 502).json({
        ok: false,
        error: (result.json && (result.json.message || result.json.errorDescription)) || 'Erro ao gerar cobrança Pix.',
      });
      return;
    }

    const data = result.json;

    if (data.status && data.status !== 'OK' && data.status !== 'PENDING') {
      res.status(502).json({
        ok: false,
        error: data.errorDescription || data.details || ('Cobrança não aprovada (status: ' + data.status + ').'),
      });
      return;
    }

    const pixNode = data.pix || (data.order && data.order.pix) || null;

    if (!pixNode || !pixNode.code) {
      res.status(502).json({ ok: false, error: 'Transação criada, mas sem chave Pix na resposta.' });
      return;
    }

    res.status(200).json({
      ok: true,
      transactionId: data.transactionId,
      amount,
      pixCode: pixNode.code,
      qrImage: pixNode.image || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Erro interno ao gerar Pix.' });
  }
};
