import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Loader2, Save, Ticket, X } from "lucide-react";
import api from "../../lib/api";

const OUTCOMES = [["", "No outcome yet"], ["resolved", "Resolved on call"], ["follow_up", "Needs follow-up"], ["sale", "Sale / upgrade"], ["escalated", "Escalated"], ["voicemail", "Left voicemail"], ["no_answer", "No answer"], ["wrong_number", "Wrong number"]];

export function CallNotesPanel({ call, onClose, onSaved }) {
  const [notes, setNotes] = useState(call?.notes || "");
  const [outcome, setOutcome] = useState(call?.outcome || "");
  const [saving, setSaving] = useState(false);
  const [ticketing, setTicketing] = useState(false);
  const [ticketId, setTicketId] = useState(call?.ticket_id);
  useEffect(() => { setNotes(call?.notes || ""); setOutcome(call?.outcome || ""); setTicketId(call?.ticket_id); }, [call?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!call) return null;

  const save = async () => { setSaving(true); try { const { data } = await api.patch(`/voice/calls/${call.id}/notes`, { notes, outcome: outcome || null }); toast.success("Call notes saved"); onSaved?.(data); } catch (e) { toast.error(e.response?.data?.detail || "Could not save notes"); } setSaving(false); };
  const makeTicket = async () => { setTicketing(true); try { if (notes !== (call.notes || "")) await api.patch(`/voice/calls/${call.id}/notes`, { notes, outcome: outcome || null }); const { data } = await api.post(`/voice/calls/${call.id}/ticket`); setTicketId(data.ticket.id); toast.success(data.created ? "Ticket created from this call" : "Ticket already exists for this call"); onSaved?.({ ...call, ticket_id: data.ticket.id, notes, outcome }); } catch (e) { toast.error(e.response?.data?.detail || "Could not create ticket"); } setTicketing(false); };

  return <div className="rounded-2xl border border-border bg-surface p-5" data-testid="call-notes-panel">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">Call notes</p><p className="mt-0.5 font-mono text-[11px] text-inkSecondary">{call.contact_name || (call.direction === "inbound" ? call.from : call.to)} · {call.direction} · {call.status}</p></div><button onClick={onClose} className="icon-button" aria-label="Close notes" data-testid="call-notes-close"><X className="size-4" /></button></div>
    {call.ivr_path?.length > 0 && <p className="mt-3 rounded-lg bg-bg px-3 py-2 text-[11px] text-inkSecondary">Path: {call.ivr_path.join(" → ")}</p>}
    <textarea rows="5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the customer need? Next steps?" className="field mt-3 resize-none" data-testid="call-notes-input" />
    <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="field mt-3" data-testid="call-outcome-select">{OUTCOMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    <div className="mt-4 flex gap-2"><button onClick={save} disabled={saving} className="btn-primary flex-1 disabled:opacity-50" data-testid="call-notes-save">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save notes</button>{ticketId ? <Link to="/app/tickets" className="btn-secondary" data-testid="call-ticket-link"><Ticket className="size-4" />Open ticket</Link> : <button onClick={makeTicket} disabled={ticketing} className="btn-secondary disabled:opacity-50" data-testid="call-create-ticket">{ticketing ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}Create ticket</button>}</div>
    {call.notes_updated_at && <p className="mt-3 text-[10px] text-inkSecondary">Last saved {new Date(call.notes_updated_at).toLocaleString()}{call.notes_by ? ` by ${call.notes_by}` : ""}</p>}
  </div>;
}
