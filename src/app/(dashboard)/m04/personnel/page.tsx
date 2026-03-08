import { redirect } from "next/navigation";

/** Redirect /m04/personnel (English) to /m04/personel (Turkish route) */
export default function M04PersonnelRedirect() {
  redirect("/m04/personel");
}
