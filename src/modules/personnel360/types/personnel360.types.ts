/**
 * Personnel 360 module types.
 * Raw DB shape and partial real-data slice for the loader/mapper layer.
 */

import type { PersonnelRecord, LinkedUserInfo } from "@/lib/m04/personnel";

/** Raw fetched data from DB (personnel, manager, linked user). */
export type Personnel360RawData = {
  personnel: PersonnelRecord | null;
  manager: PersonnelRecord | null;
  linkedUser: LinkedUserInfo | null;
};

/** Partial real-data slice mapped from schema. Merged with mock for full Personnel360Data. */
export type Personnel360RealDataSlice = {
  header?: Partial<{
    initials: string;
    fullName: string;
    title: string;
    email: string;
    manager: string;
    status: string;
    statusVariant?: "active" | "inactive" | "warning";
  }>;
  overview?: {
    identity?: Partial<{
      adSoyad: string;
      kurumsalEposta: string;
      unvan: string;
      departman: string;
      yonetici: string;
      telefon: string;
      iseGirisTarihi: string;
      toplamKidem: string;
      sistemDurumu: string;
    }>;
    orgPosition?: Partial<{
      rbacRolu: string;
      sistemHesabiDurumu: string;
    }>;
  };
  kpi?: Array<{ label: string; value: string }>;
};
