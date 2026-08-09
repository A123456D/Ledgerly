import { uid } from "./format";
import type { Business, BusinessLogo } from "./types";

/** Migrate legacy single logoDataUrl into logos[] and keep logoDataUrl synced. */
export function normalizeBusinessLogos(business: Business): Business {
  const logos = [...(business.logos ?? [])];
  if (logos.length === 0 && business.logoDataUrl) {
    logos.push({
      id: uid("logo"),
      name: "Logo 1",
      dataUrl: business.logoDataUrl,
      createdAt: business.updatedAt || business.createdAt || new Date().toISOString(),
    });
  }

  let defaultLogoId = business.defaultLogoId;
  if (defaultLogoId && !logos.some((l) => l.id === defaultLogoId)) {
    defaultLogoId = undefined;
  }
  if (!defaultLogoId && logos.length > 0) {
    defaultLogoId = logos[0].id;
  }

  const defaultLogo = logos.find((l) => l.id === defaultLogoId);
  return {
    ...business,
    logos,
    defaultLogoId,
    logoDataUrl: defaultLogo?.dataUrl,
  };
}

export function resolveLogoDataUrl(
  business: Business,
  logoId?: string | null,
): string | undefined {
  const normalized = normalizeBusinessLogos(business);
  const logos = normalized.logos ?? [];
  if (logoId === null) return undefined;
  if (logoId) {
    return logos.find((l) => l.id === logoId)?.dataUrl;
  }
  if (normalized.defaultLogoId) {
    return logos.find((l) => l.id === normalized.defaultLogoId)?.dataUrl;
  }
  return logos[0]?.dataUrl ?? normalized.logoDataUrl;
}

export function addBusinessLogo(
  business: Business,
  dataUrl: string,
  name?: string,
): Business {
  const normalized = normalizeBusinessLogos(business);
  const logos = [...(normalized.logos ?? [])];
  const logo: BusinessLogo = {
    id: uid("logo"),
    name: name?.trim() || `Logo ${logos.length + 1}`,
    dataUrl,
    createdAt: new Date().toISOString(),
  };
  logos.push(logo);
  return normalizeBusinessLogos({
    ...normalized,
    logos,
    defaultLogoId: normalized.defaultLogoId || logo.id,
  });
}

export function removeBusinessLogo(business: Business, logoId: string): Business {
  const normalized = normalizeBusinessLogos(business);
  const logos = (normalized.logos ?? []).filter((l) => l.id !== logoId);
  const defaultLogoId =
    normalized.defaultLogoId === logoId
      ? logos[0]?.id
      : normalized.defaultLogoId;
  return normalizeBusinessLogos({
    ...normalized,
    logos,
    defaultLogoId,
    logoDataUrl: undefined,
  });
}

export function renameBusinessLogo(
  business: Business,
  logoId: string,
  name: string,
): Business {
  const normalized = normalizeBusinessLogos(business);
  return normalizeBusinessLogos({
    ...normalized,
    logos: (normalized.logos ?? []).map((l) =>
      l.id === logoId ? { ...l, name: name.trim() || l.name } : l,
    ),
  });
}

export function setDefaultBusinessLogo(
  business: Business,
  logoId: string,
): Business {
  const normalized = normalizeBusinessLogos(business);
  if (!(normalized.logos ?? []).some((l) => l.id === logoId)) return normalized;
  return normalizeBusinessLogos({
    ...normalized,
    defaultLogoId: logoId,
  });
}
