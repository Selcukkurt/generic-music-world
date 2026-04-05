/** Legal / product document versions tracked in user_agreement_acceptances.agreement_key + agreement_version */
export const AGREEMENT_KEYS = {
  confidentiality: "confidentiality",
  intellectual_property: "intellectual_property",
  gm_dna_final: "gm_dna_final",
} as const;

export type AgreementKey = (typeof AGREEMENT_KEYS)[keyof typeof AGREEMENT_KEYS];

export const AGREEMENT_VERSIONS: Record<AgreementKey, string> = {
  confidentiality: "2.0",
  intellectual_property: "1.0",
  gm_dna_final: "1.0",
};

export const GM_DNA_CONTENT_VERSION = "2.0";
