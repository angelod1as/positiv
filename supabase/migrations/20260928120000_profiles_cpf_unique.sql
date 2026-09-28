-- One profile per CPF. Asaas knows a customer by CPF, so two profiles sharing
-- one end up sharing a customer, and the checkout of the second fails on
-- profiles_asaas_customer_id. A CPF also names one person, and two profiles for
-- one person split their history.
--
-- Compared by digits alone: the column holds both "529.982.247-25" and
-- "52998224725", which are the same CPF. A value with no digits at all names
-- nobody and is left out, as is null.
--
-- Production held four duplicated CPFs; they were merged by hand on
-- 2026-09-28, before this index.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles ((regexp_replace(cpf, '\D', '', 'g')))
  WHERE regexp_replace(coalesce(cpf, ''), '\D', '', 'g') <> '';
