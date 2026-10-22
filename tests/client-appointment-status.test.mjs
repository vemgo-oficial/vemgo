import test from "node:test";
import assert from "node:assert/strict";
import {
  canClientCancelRequest,
  getClientAppointmentActions,
  getClientAppointmentState,
} from "../lib/client-appointment-status.ts";

const now = Date.parse("2026-10-20T15:00:00.000Z");

test("client can cancel only a pre-order request in an eligible state", () => {
  for (const status of ["pending", "classified", "matching", "matched"]) {
    assert.equal(canClientCancelRequest(status, false), true, `${status} can be cancelled before order creation`);
    assert.equal(canClientCancelRequest(status, true), false, `${status} cannot use request cancellation after an order exists`);
  }
  for (const status of ["scheduled", "cancelled", "expired", "completed", "unknown"]) {
    assert.equal(canClientCancelRequest(status, false), false, `${status} is not cancellable`);
  }
});

function appointment(status, startsAt, endsAt, cancellationReason = null) {
  return {
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    cancellation_reason: cancellationReason,
  };
}

test("future confirmed appointment remains scheduled", () => {
  assert.equal(
    getClientAppointmentState(
      appointment("confirmed", "2026-10-21T15:00:00Z", "2026-10-21T16:00:00Z"),
      "confirmed",
      now,
    ),
    "confirmed",
  );
});

test("past pending appointment needs regularization, not completion", () => {
  assert.equal(
    getClientAppointmentState(
      appointment("scheduled", "2026-10-15T15:00:00Z", "2026-10-15T16:00:00Z"),
      "confirmed",
      now,
    ),
    "regularization",
  );
});

test("past completed appointment stays completed", () => {
  assert.equal(
    getClientAppointmentState(
      appointment("completed", "2026-10-15T15:00:00Z", "2026-10-15T16:00:00Z"),
      "completed",
      now,
    ),
    "completed",
  );
});

test("cancelled appointment stays cancelled after its time", () => {
  assert.equal(
    getClientAppointmentState(
      appointment("cancelled", "2026-10-21T15:00:00Z", "2026-10-21T16:00:00Z"),
      "confirmed",
      now,
    ),
    "cancelled",
  );
});

test("refused appointment is preserved as refused", () => {
  assert.equal(
    getClientAppointmentState(
      appointment("cancelled", "2026-10-21T15:00:00Z", "2026-10-21T16:00:00Z", "Horário recusado pelo profissional"),
      "confirmed",
      now,
    ),
    "rejected",
  );
});

test("started appointment without an in-progress record is not inferred as in progress", () => {
  assert.equal(
    getClientAppointmentState(
      appointment("confirmed", "2026-10-20T14:30:00Z", "2026-10-20T15:30:00Z"),
      "confirmed",
      now,
    ),
    "started_unreported",
  );
  assert.equal(
    getClientAppointmentState(
      appointment("in_progress", "2026-10-20T14:30:00Z", "2026-10-20T15:30:00Z"),
      "in_progress",
      now,
    ),
    "in_progress",
  );
});

test("start and end boundaries use instants while display uses Sao Paulo time", () => {
  const nearMidnightNow = Date.parse("2026-10-21T02:30:00.000Z");
  const localDay = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(nearMidnightNow);
  assert.equal(localDay, "20/10/2026");
  assert.equal(
    getClientAppointmentState(
      appointment("confirmed", "2026-10-21T02:00:00Z", "2026-10-21T03:00:00Z"),
      "confirmed",
      nearMidnightNow,
    ),
    "started_unreported",
  );
  assert.equal(
    getClientAppointmentState(
      appointment("confirmed", "2026-10-21T02:00:00Z", "2026-10-21T03:00:00Z"),
      "confirmed",
      Date.parse("2026-10-21T03:00:00Z"),
    ),
    "regularization",
  );
});

test("client can request cancellation only before a scheduled start", () => {
  const actions = getClientAppointmentActions(
    appointment("confirmed", "2026-10-21T15:00:00Z", "2026-10-21T16:00:00Z"),
    "confirmed",
    now,
  );
  assert.deepEqual(actions, { cancel: true, reportNoShow: false, submitResult: false });
});

test("client cannot cancel a terminal or already-started appointment", () => {
  assert.equal(
    getClientAppointmentActions(
      appointment("completed", "2026-10-15T15:00:00Z", "2026-10-15T16:00:00Z"),
      "completed",
      now,
    ).cancel,
    false,
  );
  assert.equal(
    getClientAppointmentActions(
      appointment("confirmed", "2026-10-20T14:30:00Z", "2026-10-20T15:30:00Z"),
      "confirmed",
      now,
    ).cancel,
    false,
  );
});

test("no-show report is offered only after the end of a confirmed appointment", () => {
  assert.equal(
    getClientAppointmentActions(
      appointment("confirmed", "2026-10-20T13:00:00Z", "2026-10-20T14:00:00Z"),
      "confirmed",
      now,
    ).reportNoShow,
    true,
  );
  assert.equal(
    getClientAppointmentActions(
      appointment("scheduled", "2026-10-15T13:00:00Z", "2026-10-15T14:00:00Z"),
      "confirmed",
      now,
    ).reportNoShow,
    false,
  );
});

test("client result is offered after explicit appointment end, never inferred", () => {
  assert.equal(
    getClientAppointmentActions(
      appointment("in_progress", "2026-10-20T13:00:00Z", "2026-10-20T14:00:00Z"),
      "in_progress",
      now,
    ).submitResult,
    true,
  );
  assert.equal(
    getClientAppointmentActions(
      appointment("confirmed", "2026-10-20T15:30:00Z", "2026-10-20T16:00:00Z"),
      "confirmed",
      now,
    ).submitResult,
    false,
  );
});

test("a previously submitted client result cannot be submitted again", () => {
  assert.deepEqual(
    getClientAppointmentActions(
      { ...appointment("completed", "2026-10-15T15:00:00Z", "2026-10-15T16:00:00Z"), client_outcome: "problem_reported" },
      "disputed",
      now,
    ),
    { cancel: false, reportNoShow: false, submitResult: false },
  );
});

test("explicit customer outcomes override the underlying order label", () => {
  const base = appointment("completed", "2026-10-15T15:00:00Z", "2026-10-15T16:00:00Z");
  assert.equal(
    getClientAppointmentState({ ...base, client_outcome: "problem_reported" }, "disputed", now),
    "disputed",
  );
  assert.equal(
    getClientAppointmentState({ ...base, client_outcome: "no_show_reported" }, "disputed", now),
    "no_show",
  );
  assert.equal(
    getClientAppointmentState({ ...base, client_outcome: "satisfied" }, "completed", now),
    "completed",
  );
});
