import siteData from '../data/site.json';

export type StudioId = 'pushkin' | 'frunzenskaya';

export interface Studio {
  id: StudioId;
  name: string;
  short: string;
  city: string;
  address: string;
  tagline: string;
  text: string;
  telegram: string;
  whatsapp: string;
  max: string;
  booking: string;
  photos: string[];
  envMap: string;
}

export const SITE = siteData;
export const STUDIOS = siteData.studios as Studio[];

const STORAGE_KEY = 'tg-studio';
type Listener = (studio: StudioId | null) => void;
const listeners = new Set<Listener>();

function readStored(): StudioId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'pushkin' || v === 'frunzenskaya' ? v : null;
  } catch {
    return null;
  }
}

function writeStored(id: StudioId | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage недоступен (приватный режим и т.п.) — состояние живёт только в памяти сессии */
  }
}

let current: StudioId | null = readStored();

export function getStudio(): StudioId | null {
  return current;
}

export function getStudioData(id: StudioId | null = current): Studio | null {
  if (!id) return null;
  return STUDIOS.find((s) => s.id === id) ?? null;
}

/** YCLIENTS-ссылка филиала, с откатом на общую ссылку выбора города, пока у студии нет прямой. */
export function getBookingUrl(id: StudioId | null = current): string {
  const studio = getStudioData(id);
  if (studio && studio.booking.startsWith('http')) return studio.booking;
  return SITE.booking.all;
}

export function setStudio(id: StudioId | null): void {
  if (id === current) return;
  current = id;
  writeStored(id);
  listeners.forEach((fn) => fn(current));
}

/** @returns функция отписки */
export function onStudioChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
