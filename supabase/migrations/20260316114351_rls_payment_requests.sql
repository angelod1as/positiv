CREATE POLICY service_role_all_access_payment_requests
ON public.payment_requests FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY anon_deny_payment_requests
ON public.payment_requests FOR ALL
TO anon
USING (false) WITH CHECK (false);

CREATE POLICY authenticated_deny_payment_requests
ON public.payment_requests FOR ALL
TO authenticated
USING (false) WITH CHECK (false);
