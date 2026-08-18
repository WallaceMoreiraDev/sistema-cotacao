import { getSystemSettingsAction, updateSystemSettingsAction } from '../actions/admin';

const BLING_API_BASE = 'https://www.bling.com.br/Api/v3';

export class BlingService {
  private static async getSettings() {
    const { success, data } = await getSystemSettingsAction();
    if (!success || !data) throw new Error('Não foi possível carregar as configurações do sistema.');
    return data;
  }

  /**
   * Generates the authorization URL to redirect the user to Bling's consent screen.
   */
  static async getAuthorizationUrl(state: string) {
    const settings = await this.getSettings();
    if (!settings.bling_client_id) {
      throw new Error('Client ID do Bling não configurado.');
    }

    const url = new URL(`${BLING_API_BASE}/oauth/authorize`);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', settings.bling_client_id);
    url.searchParams.append('state', state);

    return url.toString();
  }

  /**
   * Exchanges an authorization code for access and refresh tokens.
   */
  static async exchangeCodeForToken(code: string) {
    const settings = await this.getSettings();
    if (!settings.bling_client_id || !settings.bling_client_secret) {
      throw new Error('Credenciais do Bling não configuradas.');
    }

    const credentials = Buffer.from(`${settings.bling_client_id}:${settings.bling_client_secret}`).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);

    const response = await fetch(`${BLING_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Accept': '1.0'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bling Token Exchange Error:', errorText);
      throw new Error(`Falha ao obter token do Bling: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Save tokens to DB
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
    await updateSystemSettingsAction({
      ...settings,
      bling_access_token: data.access_token,
      bling_refresh_token: data.refresh_token,
      bling_token_expires_at: expiresAt
    });

    return data;
  }

  /**
   * Refreshes the access token if it is expired or about to expire.
   */
  static async refreshTokenIfNeeded() {
    let settings = await this.getSettings();
    
    if (!settings.bling_access_token || !settings.bling_refresh_token || !settings.bling_token_expires_at) {
      throw new Error('O Bling não está autenticado. É necessário realizar a conexão OAuth primeiro.');
    }

    const expiresAt = new Date(settings.bling_token_expires_at).getTime();
    const now = Date.now();
    // 5 minutes buffer
    const buffer = 5 * 60 * 1000;

    if (now > expiresAt - buffer) {
      console.log('Bling token expirarado ou prestes a expirar. Atualizando...');
      const credentials = Buffer.from(`${settings.bling_client_id}:${settings.bling_client_secret}`).toString('base64');
      
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', settings.bling_refresh_token);

      const response = await fetch(`${BLING_API_BASE}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
          'Accept': '1.0'
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error('Falha ao renovar o token do Bling. É necessário reconectar manualmente.');
      }

      const data = await response.json();
      const newExpiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
      
      await updateSystemSettingsAction({
        ...settings,
        bling_access_token: data.access_token,
        bling_refresh_token: data.refresh_token,
        bling_token_expires_at: newExpiresAt
      });

      settings.bling_access_token = data.access_token;
    }

    return settings.bling_access_token;
  }

  /**
   * Authenticated request to Bling API
   */
  static async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.refreshTokenIfNeeded();
    
    const url = endpoint.startsWith('http') ? endpoint : `${BLING_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      console.error(`Bling API Error [${response.status}] for ${url}`);
    }

    return response;
  }

  /**
   * Fetch all categories from Bling (returns all pages combined)
   */
  static async getAllCategories() {
    let allCategories: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.request(`/categorias/produtos?pagina=${page}&limite=100`);
      if (!response.ok) {
        throw new Error('Falha ao buscar categorias do Bling');
      }
      const result = await response.json();
      const data = result.data || [];
      
      allCategories = allCategories.concat(data);

      if (data.length < 100) {
        hasMore = false;
      } else {
        page++;
        // API rate limit protection (optional but recommended for loop)
        await new Promise(res => setTimeout(res, 333));
      }
    }

    return allCategories;
  }

  /**
   * Fetch all products from Bling (returns all pages combined)
   */
  static async getAllProducts() {
    let allProducts: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // We can also fetch stock inside the product if we pass specific params, but usually /produtos?criterio=5 (situacao=ativo) 
      const response = await this.request(`/produtos?pagina=${page}&limite=100`);
      if (!response.ok) {
        throw new Error('Falha ao buscar produtos do Bling');
      }
      const result = await response.json();
      const data = result.data || [];
      
      allProducts = allProducts.concat(data);

      if (data.length < 100) {
        hasMore = false;
      } else {
        page++;
        // API rate limit protection
        await new Promise(res => setTimeout(res, 333));
      }
    }

    return allProducts;
  }

  /**
   * Fetch a single product by ID
   */
  static async getProduct(id: string | number) {
    const response = await this.request(`/produtos/${id}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data;
  }

  /**
   * Fetch a single category by ID
   */
  static async getCategory(id: string | number) {
    const response = await this.request(`/categorias/produtos/${id}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data;
  }

  /**
   * Fetch stock balance for a single product ID
   */
  static async getStockBalance(produtoId: string | number) {
    const response = await this.request(`/estoques/saldos?idsProdutos[]=${produtoId}`);
    if (!response.ok) return null;
    const result = await response.json();
    if (result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  }

  /**
   * Fetch stock balances for multiple product IDs
   */
  static async getStockBalancesForProducts(productIds: string[]) {
    if (!productIds || productIds.length === 0) return [];
    
    // Bling requires IDs passed as query array: idsProdutos[]=1&idsProdutos[]=2...
    const urlParams = new URLSearchParams();
    productIds.forEach(id => urlParams.append('idsProdutos[]', id));
    
    const response = await this.request(`/estoques/saldos?${urlParams.toString()}`);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha ao buscar saldos de estoque do Bling: ${response.status} - ${errText}`);
    }
    const result = await response.json();
    return result.data || [];
  }

  /**
   * Fetch a single contact (client) from Bling
   */
  static async getContact(id: string) {
    const response = await this.request(`/contatos/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Falha ao buscar contato do Bling: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }
}
