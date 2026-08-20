import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { BlingService } from './app/lib/services/blingService';
async function main() {
  try {
    const res = await BlingService.request('/listas-precos');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  }
}
main();
