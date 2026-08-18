// Recebe as notificações da SigiloPay (TRANSACTION_CREATED, TRANSACTION_PAID, etc).
//
// Esta rota não precisa fazer nada para o checkout funcionar — a página de
// pagamento confirma o Pix consultando /api/status diretamente. Ela existe
// para você poder plugar ações extras aqui no futuro (enviar e-mail, marcar
// pedido como pago no seu banco de dados, disparar Purchase para o Facebook
// Pixel do lado do servidor, etc).
//
// Configure a URL pública desta rota (https://SEUDOMINIO/api/webhook) no
// painel da SigiloPay se quiser cadastrar o webhook manualmente também —
// mas o checkout já envia essa mesma URL automaticamente via "callbackUrl"
// a cada cobrança criada em /api/pix.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const event = body.event;
    const transaction = body.transaction || {};

    console.log('[SigiloPay webhook]', event, transaction.id, transaction.status);

    // Ponto de extensão: quando event === 'TRANSACTION_PAID', dá pra
    // disparar um e-mail de confirmação, gravar em um banco, etc.
  } catch (err) {
    console.error('[SigiloPay webhook] erro ao processar payload', err);
  }

  res.status(200).json({ ok: true });
};
