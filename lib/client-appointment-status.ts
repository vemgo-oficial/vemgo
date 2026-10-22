export type ClientAppointment = {
  starts_at: string;
  ends_at: string;
  status: string;
  cancellation_reason?: string | null;
  client_outcome?: string | null;
};

export type ClientAppointmentActions = {
  cancel: boolean;
  reportNoShow: boolean;
  submitResult: boolean;
};

const clientCancellableRequestStatuses = new Set([
  "pending",
  "classified",
  "matching",
  "matched",
]);

/** Presentation guard only; client_cancel_request validates these rules in the database. */
export function canClientCancelRequest(status: string | null | undefined, hasOrder: boolean) {
  return !hasOrder && !!status && clientCancellableRequestStatuses.has(status);
}

/** Presentation guard only; the database RPC repeats every check authoritatively. */
export function getClientAppointmentActions(
  appointment: ClientAppointment | null | undefined,
  orderStatus: string | null | undefined,
  now: number | Date | null,
): ClientAppointmentActions {
  const denied = { cancel: false, reportNoShow: false, submitResult: false };
  if (!appointment || appointment.client_outcome) return denied;

  const nowValue = now instanceof Date ? now.getTime() : now;
  const startsAt = Date.parse(appointment.starts_at);
  const endsAt = Date.parse(appointment.ends_at);
  if (nowValue === null || !Number.isFinite(nowValue) || !Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    return denied;
  }

  const cancel =
    (appointment.status === "scheduled" || appointment.status === "confirmed") &&
    startsAt > nowValue &&
    (orderStatus === "pending" || orderStatus === "confirmed");
  const reportNoShow =
    appointment.status === "confirmed" &&
    endsAt <= nowValue &&
    (orderStatus === "confirmed" || orderStatus === "in_progress");
  const submitResult =
    ["confirmed", "in_progress", "completed"].includes(appointment.status) &&
    endsAt <= nowValue &&
    ["confirmed", "in_progress", "completed"].includes(orderStatus ?? "");

  return { cancel, reportNoShow, submitResult };
}

export type ClientAppointmentState =
  | "cancelled"
  | "rejected"
  | "completed"
  | "disputed"
  | "no_show"
  | "in_progress"
  | "regularization"
  | "started_unreported"
  | "confirmed"
  | "scheduled"
  | "other";

/**
 * Derives a presentation state only. It never updates an order or appointment.
 * `now` is injectable so temporal boundaries can be tested deterministically.
 */
export function getClientAppointmentState(
  appointment: ClientAppointment | null | undefined,
  orderStatus: string | null | undefined,
  now: number | Date | null = null,
): ClientAppointmentState {
  if (appointment?.client_outcome === "cancelled_by_client") return "cancelled";
  if (appointment?.client_outcome === "no_show_reported") return "no_show";
  if (appointment?.client_outcome === "problem_reported") return "disputed";
  if (appointment?.client_outcome === "satisfied") return "completed";
  if (orderStatus === "cancelled") return "cancelled";
  if (appointment?.status === "cancelled") {
    return appointment.cancellation_reason
      ?.toLocaleLowerCase("pt-BR")
      .includes("recusado pelo profissional")
      ? "rejected"
      : "cancelled";
  }
  if (appointment?.status === "rejected") return "rejected";
  if (orderStatus === "completed" || appointment?.status === "completed") {
    return "completed";
  }
  if (appointment?.status === "no_show") return "no_show";
  if (orderStatus === "in_progress" || appointment?.status === "in_progress") {
    return "in_progress";
  }

  if (appointment?.status !== "scheduled" && appointment?.status !== "confirmed") {
    return "other";
  }

  const startsAt = Date.parse(appointment.starts_at);
  const endsAt = Date.parse(appointment.ends_at);
  const nowValue = now instanceof Date ? now.getTime() : now;
  if (
    nowValue === null ||
    !Number.isFinite(nowValue) ||
    !Number.isFinite(startsAt) ||
    !Number.isFinite(endsAt)
  ) {
    return appointment.status;
  }

  if (startsAt <= nowValue) {
    return endsAt <= nowValue ? "regularization" : "started_unreported";
  }

  return appointment.status;
}
