import { updateBookingStatusAction } from "../../app/actions/transactions";
import { ConfirmSubmitButton } from "./confirm-submit-button";

export function BookingStatusAction({ id, status, label, danger = false, confirm }: { id: string; status: string; label: string; danger?: boolean; confirm?: string }) {
  return <form action={updateBookingStatusAction}><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={status}/>{confirm ? <ConfirmSubmitButton label={label} confirmMessage={confirm} showIcon={false} className={`appointment-button ${danger ? "appointment-button-danger" : ""}`}/> : <button className="appointment-button">{label}</button>}</form>;
}
