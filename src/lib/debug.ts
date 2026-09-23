/*
  Development-only switches for measuring what each rendering feature costs.
  Read inside frame loops; every field defaults to false and the object is
  exposed as window.__aubadeFlags in development builds only.
*/
export const flags = {
  noBake: false,
  noShadow: false,
  noReflector: false,
  noTransmission: false,
  noContact: false,
  noLines: false,
};
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __aubadeFlags: typeof flags }).__aubadeFlags = flags;
}
