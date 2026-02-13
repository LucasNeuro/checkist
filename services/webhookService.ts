const getWebhookUrl = () => import.meta.env.VITE_MAKE_WEBHOOK_URL ?? '';

export const sendWebhookEvent = async (event: string, data: Record<string, unknown>) => {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    console.warn('Webhook: VITE_MAKE_WEBHOOK_URL não configurado no .env');
    return false;
  }

  try {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      payload: data,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Webhook Error:', error);
    return false;
  }
};

