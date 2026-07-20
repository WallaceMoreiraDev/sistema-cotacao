import { useEffect, useState } from 'react';
import { searchBlingProducts } from '../lib/services/blingMockService';

type BlingProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  category: string;
};

export function useBlingMock(query: string) {
  const [data, setData] = useState<BlingProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!query.trim()) {
        if (active) {
          setData([]);
          setLoading(false);
        }
        return;
      }

      if (active) {
        setLoading(true);
      }

      const result = await searchBlingProducts(query);

      if (active) {
        setData(result as BlingProduct[]);
        setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [query]);

  return { data, loading };
}
