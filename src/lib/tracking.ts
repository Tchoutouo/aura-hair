/** Order journey, in order. Labels are in the dictionaries (dict.track.steps). */
export const STEPS = ["received", "paid", "checked", "shipped", "arrived", "delivered"] as const;
export type Step = (typeof STEPS)[number];

export const isStep = (v: unknown): v is Step => STEPS.includes(v as Step);

export interface Tracking {
  step: Step;
  /** When each step was reached (ISO dates) */
  history: { step: Step; at: string }[];
  /** Message for the customer, shown on the tracking page */
  note?: string;
}

export const initialTracking = (createdAt: string): Tracking => ({ step: "received", history: [{ step: "received", at: createdAt }] });
