import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+().\s-]{6,30}$/, "Numéro de téléphone invalide")
  .or(z.literal(""))
  .optional();

export const contactSchema = z.object({
  contact_name: z.string().trim().min(2, "Indiquez votre nom").max(120),
  contact_email: z.string().trim().email("Adresse e-mail invalide"),
  contact_phone: phone,
  company: z.string().trim().max(190).optional(),
  consent: z.literal(true, { message: "Merci d'accepter d'être recontacté au sujet de votre projet" }),
});
export type ContactValues = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Indiquez votre nom"),
    email: z.string().trim().email("Adresse e-mail invalide"),
    phone,
    company: z.string().trim().optional(),
    password: z.string().min(8, "8 caractères minimum").regex(/[A-Za-z]/, "Au moins une lettre").regex(/\d/, "Au moins un chiffre"),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { message: "Les mots de passe ne correspondent pas", path: ["password_confirmation"] });

export const quoteRequestSchema = z.object({
  // 1. Informations client
  contact_name: contactSchema.shape.contact_name,
  contact_email: contactSchema.shape.contact_email,
  contact_phone: phone,
  company: z.string().trim().max(190).optional(),
  city: z.string().trim().max(100).optional(),
  // 2. Type de projet
  project_type: z.string().min(1, "Choisissez un type de projet"),
  product_id: z.number().nullable().optional(),
  title: z.string().trim().max(190).optional(),
  description: z.string().trim().max(5000).optional(),
  // 3. Quantité / dimensions
  quantity: z.number({ message: "Quantité requise" }).int().min(1, "Au moins 1").max(100000),
  width_mm: z.number().int().min(5).max(20000).nullable().optional(),
  height_mm: z.number().int().min(5).max(20000).nullable().optional(),
  material_id: z.number().nullable().optional(),
  finish_id: z.number().nullable().optional(),
  // 4. Personnalisation
  modes: z.array(z.string()).max(5),
  text: z.string().trim().max(300).optional(),
  // 6. Délai
  urgency: z.enum(["flexible", "standard", "express"]),
  desired_date: z.string().optional(),
  // 8. Validation
  consent: z.boolean().refine((v) => v, "Merci d'accepter d'être recontacté au sujet de votre projet"),
});
export type QuoteRequestValues = z.infer<typeof quoteRequestSchema>;
