import axios from 'axios';

interface CreateLinkParams {
  amount: number;
  concept: string;
  externalReference: string;
}

export async function createMercadoPagoLink({ amount, concept, externalReference }: CreateLinkParams) {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  const response = await axios.post(
    'https://api.mercadopago.com/checkout/preferences',
    {
      items: [
        {
          title: concept,
          quantity: 1,
          unit_price: amount,
          currency_id: 'MXN',
        },
      ],
      external_reference: externalReference,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
      },
      auto_return: 'approved',
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    id: response.data.id,
    url: response.data.init_point,
  };
}
