import { syncBlingProductsAction } from './app/lib/actions/sync';

async function run() {
  const result = await syncBlingProductsAction();
  console.log(result);
}

run();
