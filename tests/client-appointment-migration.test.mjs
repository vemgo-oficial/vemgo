import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20261020140000_client_appointment_lifecycle.sql", import.meta.url),
  "utf8",
);

function functionBody(name) {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  assert.notEqual(start, -1, `${name} exists`);
  const end = migration.indexOf("$function$;", start);
  assert.notEqual(end, -1, `${name} has a closed function body`);
  return migration.slice(start, end);
}

test("migration preflight checks schema, auth roles, owner capability, and matching locks", () => {
  for (const expected of [
    "public.requests",
    "public.request_matches",
    "public.audit_logs",
    "auth.uid()",
    "authenticated",
    "pg_has_role(current_user, 'postgres', 'MEMBER')",
    "respond_to_professional_opportunity(uuid,text)",
  ]) {
    assert.ok(migration.includes(expected), `preflight includes ${expected}`);
  }
  assert.match(migration, /match_request\(uuid\)[\s\S]{0,260}FOR UPDATE/);
  assert.match(migration, /respond_to_professional_opportunity\(uuid,text\)[\s\S]{0,280}FOR UPDATE/);
});

test("pre-order cancellation checks client ownership and terminal states, and writes an audit event", () => {
  const body = functionBody("client_cancel_request");
  assert.match(body, /auth\.uid\(\)/);
  assert.match(body, /p\.user_type = 'client'/);
  assert.match(body, /r\.id = p_request_id AND r\.client_id = v_user_id/);
  assert.match(body, /FOR UPDATE/);
  assert.match(body, /status NOT IN \('pending', 'classified', 'matching', 'matched'\)/);
  assert.match(body, /INSERT INTO public\.audit_logs/);
  assert.doesNotMatch(body, /UPDATE public\.request_matches/);
});

test("appointment outcome RPC validates owner, action, timing, idempotency, and audit", () => {
  const body = functionBody("client_submit_appointment_outcome");
  for (const expected of [
    "o.client_id = v_user_id",
    "FOR UPDATE OF a",
    "FOR UPDATE",
    "'cancelled_by_client'",
    "'no_show_reported'",
    "'satisfied'",
    "'problem_reported'",
    "v_appointment.ends_at > v_now",
    "coalesce(v_appointment.client_outcome_note, '') = coalesce(v_note, '')",
    "INSERT INTO public.audit_logs",
  ]) {
    assert.ok(body.includes(expected), `outcome RPC includes ${expected}`);
  }
  assert.match(body, /client_reported_by = v_user_id/);
  assert.match(body, /WHEN v_action = 'problem' THEN 'disputed' ELSE 'completed'/);
});

test("action capability probe requires both authenticated RPC grants", () => {
  const body = functionBody("client_appointment_lifecycle_available");
  assert.match(body, /auth\.uid\(\) IS NULL/);
  assert.match(body, /to_regprocedure\('public\.client_cancel_request\(uuid\)'\)/);
  assert.match(body, /to_regprocedure\('public\.client_submit_appointment_outcome\(uuid,text,text\)'\)/);
  assert.equal((body.match(/has_function_privilege\('authenticated'/g) ?? []).length, 2);
});
