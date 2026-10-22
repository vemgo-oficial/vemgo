import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const detailSource = await readFile(new URL("../app/cliente/agendamento/[orderId]/page.tsx", import.meta.url), "utf8");
const servicesSource = await readFile(new URL("../app/cliente/servicos/page.tsx", import.meta.url), "utf8");

test("detail route accepts the request ID created by the customer flow", () => {
  assert.match(detailSource, /\.from\("requests"\)[\s\S]{0,220}\.eq\("id", recordId\)[\s\S]{0,80}\.eq\("client_id", user\.id\)/);
  assert.match(detailSource, /\.eq\("request_id", currentRequest\.id\)[\s\S]{0,80}\.eq\("client_id", user\.id\)/);
  assert.match(detailSource, /if \(!currentOrder\) \{/);
  assert.match(detailSource, /setAppointment\(null\)/);
  assert.match(detailSource, /Nenhum atendimento ou valor foi presumido/);
});

test("order and address details remain scoped to the authenticated customer", () => {
  assert.match(detailSource, /\.from\("orders"\)[\s\S]{0,160}\.eq\("id", recordId\)[\s\S]{0,80}\.eq\("client_id", user\.id\)/);
  assert.match(detailSource, /\.eq\("profile_id", user\.id\)/);
});

test("cancelled service records remain openable from My Services", () => {
  assert.match(servicesSource, /\/cliente\/agendamento\/\$\{order\.id\}/);
  assert.doesNotMatch(servicesSource, /disabled=\{isCancelled\}/);
});

test("requests without an accepted order remain visible and open by their request ID", () => {
  assert.match(servicesSource, /\.from\("requests"\)[\s\S]{0,150}\.eq\("client_id", user\.id\)/);
  assert.match(servicesSource, /!orderList\.some\(\(order\) => order\.request_id === request\.id\)/);
  assert.match(servicesSource, /\/cliente\/agendamento\/\$\{request\.id\}/);
  assert.match(servicesSource, /Ainda não registrado/);
});

test("customer actions only submit decisions through the guarded server RPCs", () => {
  assert.match(detailSource, /\.rpc\("client_cancel_request"/);
  assert.match(detailSource, /\.rpc\("client_submit_appointment_outcome"/);
  assert.match(detailSource, /setAppointment\(data as Appointment\)/);
  assert.match(detailSource, /setRequest\(data as RequestInfo\)/);
  assert.match(detailSource, /client_reported_at/);
  assert.match(detailSource, /\.rpc\([\s\S]{0,60}"client_appointment_lifecycle_available"/);
  assert.match(detailSource, /appointmentLifecycleAvailable && canClientCancelRequest/);
  assert.match(detailSource, /Pendente de regularização[\s\S]{0,400}a passagem do horário, por si só, não encerra o atendimento/);
});
