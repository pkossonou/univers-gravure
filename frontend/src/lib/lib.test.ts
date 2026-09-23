import { describe, expect, it } from "vitest";
import { ApiError, buildQuery } from "./api";
import { bytes, compact, fcfa, percent } from "./format";
import { contactSchema, quoteRequestSchema } from "./schemas";

describe("format", () => {
  it("formate les montants en FCFA sans décimales", () => {
    expect(fcfa(1250000)).toBe("1 250 000 FCFA");
    expect(fcfa(1999.6)).toBe("2 000 FCFA");
    expect(fcfa(null)).toBe("—");
    expect(fcfa(45000, false)).toBe("45 000");
  });

  it("compacte les grands nombres pour les axes", () => {
    expect(compact(1_500_000)).toBe("1,5 M");
    expect(compact(850_000)).toBe("850 k");
    expect(compact(420)).toBe("420");
  });

  it("formate tailles et pourcentages", () => {
    expect(bytes(512)).toBe("512 o");
    expect(bytes(2 * 1024 * 1024)).toBe("2,0 Mo");
    expect(percent(58.33)).toBe("58,3 %");
    expect(percent(null)).toBe("—");
  });
});

describe("api", () => {
  it("construit une query string en ignorant les valeurs vides", () => {
    expect(buildQuery({ page: 2, search: "", sort: "-total", ids: [1, 2], x: undefined, flag: false })).toBe("?page=2&sort=-total&ids=1%2C2&flag=false");
    expect(buildQuery({})).toBe("");
  });

  it("expose le premier message d'erreur d'un champ", () => {
    const e = new ApiError(422, "Invalide", { email: ["E-mail déjà utilisé", "autre"] });
    expect(e.field("email")).toBe("E-mail déjà utilisé");
    expect(e.field("name")).toBeUndefined();
  });
});

describe("schemas", () => {
  it("exige un consentement explicite pour une demande", () => {
    const r = contactSchema.safeParse({ contact_name: "Aya", contact_phone: "07 00 00 00 01" });
    expect(r.success).toBe(false);
    expect(contactSchema.safeParse({ contact_name: "Aya", contact_phone: "07 00 00 00 01", consent: true }).success).toBe(true);
  });

  it("exige le numéro WhatsApp, l'e-mail reste facultatif", () => {
    const r = contactSchema.safeParse({ contact_name: "Aya", contact_email: "", consent: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toEqual(["contact_phone"]);
  });

  it("refuse un e-mail ou un téléphone invalides", () => {
    const r = contactSchema.safeParse({ contact_name: "Aya", contact_email: "pas-un-email", contact_phone: "abc", consent: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual(["contact_email", "contact_phone"]);
  });

  it("borne la quantité d'une demande de devis", () => {
    const valid = { contact_name: "Aya", contact_phone: "0500000001", project_type: "trophee", quantity: 10, modes: [], urgency: "standard" as const, consent: true };
    expect(quoteRequestSchema.safeParse(valid).success).toBe(true);
    expect(quoteRequestSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ ...valid, project_type: "" }).success).toBe(false);
  });
});
