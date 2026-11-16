-- pgjwt is unsupported on Postgres 17 and unused here. Production dropped it
-- through the dashboard before its 17 upgrade (WEB-4); this keeps every other
-- environment the same.
DROP EXTENSION IF EXISTS pgjwt;
