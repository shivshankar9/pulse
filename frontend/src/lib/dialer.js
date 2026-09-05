import api from "./api";
import { toast } from "sonner";

let softphoneReady = false;
export const setSoftphoneReady = (value) => { softphoneReady = value; };
export const isSoftphoneReady = () => softphoneReady;

export async function dialNumber({ to, contactId, name }) {
  if (!to) return toast.error("This contact has no phone number");
  if (softphoneReady) {
    window.dispatchEvent(new CustomEvent("pulse:dial", { detail: { to, contactId, name } }));
    return;
  }
  try {
    const { data } = await api.post("/voice/dial", { to, contact_id: contactId, mode: "agent" });
    toast.success(`Calling ${name || to} — your phone will ring first`);
    return data;
  } catch (error) {
    toast.error(error.response?.data?.detail || "Could not place the call");
  }
}
