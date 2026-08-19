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

    // UTM/origem da campanha + endereço de entrega, capturados no navegador e
    // repassados aqui para ficarem gravados na transação da SigiloPay (metadata
    // aparece no painel deles e no payload do webhook — é o jeito de saber pra
    // onde entregar e de qual campanha veio a venda, já que a API de pix/receive
    // não tem um campo dedicado de endereço).
    const utm = body.utm && typeof body.utm === 'object' ? body.utm : {};
    const address = body.address && typeof body.address === 'object' ? body.address : {};
    const addressMeta = {};
    if (address.cep) addressMeta.endereco_cep = address.cep;
    if (address.rua) addressMeta.endereco_rua = address.rua;
    if (address.numero) addressMeta.endereco_numero = address.numero;
    if (address.complemento) addressMeta.endereco_complemento = address.complemento;
    if (address.bairro) addressMeta.endereco_bairro = address.bairro;
    if (address.cidade) addressMeta.endereco_cidade = address.cidade;
    if (address.estado) addressMeta.endereco_estado = address.estado;

    const metadataCombined = { ...utm, ...addressMeta };
    const metadata = Object.keys(metadataCombined).length ? metadataCombined : undefined;

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
      ...(metadata ? { metadata } : {}),
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

    // Prefere o QR já em base64 (evita o navegador ter que baixar a imagem
    // de outro domínio depois — carrega instantâneo, sem round-trip extra).
    const qrDataUri = pixNode.base64
      ? (pixNode.base64.indexOf('data:image') === 0 ? pixNode.base64 : 'data:image/png;base64,' + pixNode.base64)
      : null;

    res.status(200).json({
      ok: true,
      transactionId: data.transactionId,
      amount,
      pixCode: pixNode.code,
      qrImage: qrDataUri || pixNode.image || null,
    });
  } catch (err) {
    console.error('[api/pix] erro inesperado', err);
    res.status(500).json({ ok: false, error: 'Erro interno ao gerar Pix: ' + (err && err.message ? err.message : String(err)) });
  }
};
