-- Script para criação das Tabelas de Preços

-- 1. Tabela price_tables
CREATE TABLE IF NOT EXISTS public.price_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela price_table_items
CREATE TABLE IF NOT EXISTS public.price_table_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(price_table_id, sku)
);

-- 3. Adicionando coluna price_table_id na tabela protocols
ALTER TABLE public.protocols
ADD COLUMN IF NOT EXISTS price_table_id UUID REFERENCES public.price_tables(id) ON DELETE SET NULL;

-- Atualizar RLS para price_tables e price_table_items (se RLS estiver habilitado)
ALTER TABLE public.price_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_table_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura autenticada price_tables" ON public.price_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserção/atualização price_tables" ON public.price_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir leitura autenticada price_table_items" ON public.price_table_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserção/atualização price_table_items" ON public.price_table_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
