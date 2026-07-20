import { blingMockProducts } from '../mocks/blingMockData';

export async function searchBlingProducts(query: string) {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const normalizedQuery = query.toLowerCase();

  return blingMockProducts.filter((product) => {
    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.sku.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery)
    );
  });
}
