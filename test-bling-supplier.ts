import { BlingService } from './app/lib/services/blingService';

async function test() {
  try {
    console.log('Fetching suppliers from Bling...');
    const response = await BlingService.request('/produtos/fornecedores?limite=10');
    if (response.ok) {
      const data = await response.json();
      console.log('Success:', JSON.stringify(data, null, 2));
    } else {
      console.error('Error fetching suppliers:', await response.text());
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();
