import { BlingService } from './app/lib/services/blingService';
async function main() {
  console.log('Testing Bling...');
  try {
    const res = await BlingService.createCategory({ descricao: 'Categoria Teste' });
    console.log('Success:', res);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
main();
