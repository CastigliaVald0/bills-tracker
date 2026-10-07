/**
 * Cotización del dólar. Fuente principal: la pizarra de BROU (brou.com.uy/cotizaciones),
 * que es la que refleja el valor comercial del día. Si esa lectura falla, se cae de vuelta
 * al web service oficial del BCU, que publica con un día hábil de atraso.
 */

export type UsdRate = {
  source: "BROU" | "BCU";
  compra: number;
  venta: number;
  /** Fecha de la cotización cuando la fuente la publica (BCU). BROU no la expone. */
  date: string | null;
  /** Cuándo se leyó de la fuente. Solo viene cuando sale de la copia guardada. */
  leidaEl?: Date;
  /** True cuando ninguna fuente respondió y esto es lo último que había. */
  vieja?: boolean;
};

const REVALIDATE_SECONDS = 3600;

// --- BROU ---------------------------------------------------------------

/** Endpoint interno que usa la propia página de cotizaciones para renderizar la tabla. */
const BROU_PORTLET_URL =
  "https://www.brou.com.uy/c/portal/render_portlet" +
  "?p_l_id=20593" +
  "&p_p_id=cotizacionfull_WAR_broutmfportlet_INSTANCE_otHfewh1klyS" +
  "&p_p_lifecycle=0&p_t_lifecycle=0&p_p_state=normal&p_p_mode=view" +
  "&p_p_col_id=column-1&p_p_col_pos=0&p_p_col_count=2&p_p_isolated=1" +
  "&currentURL=%2Fcotizaciones";

function parseBrouNumber(raw: string): number {
  // Formato "41,45000" → 41.45
  return Number(raw.trim().replace(/\./g, "").replace(",", "."));
}

async function getBrouUsdRate(): Promise<UsdRate | null> {
  let html: string;
  try {
    const res = await fetch(BROU_PORTLET_URL, {
      method: "POST",
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  for (const [, row] of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const name = row.match(/<p class="moneda">([^<]*)<\/p>/)?.[1]?.trim();
    // La tabla trae "Dólar" y "Dólar eBROU"; queremos la cotización general.
    if (name !== "Dólar") continue;

    const values = [...row.matchAll(/<p class="valor">([^<]*)<\/p>/g)].map((m) => m[1]);
    if (values.length < 2) return null;

    const compra = parseBrouNumber(values[0]);
    const venta = parseBrouNumber(values[1]);
    if (!Number.isFinite(compra) || !Number.isFinite(venta) || venta <= 0) return null;

    return { source: "BROU", compra, venta, date: null };
  }

  return null;
}

// --- BCU (respaldo) -----------------------------------------------------

const BCU_ENDPOINT = "https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones";
const BCU_USD_CURRENCY_CODE = "2225";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildBcuSoapRequest(fechaDesde: string, fechaHasta: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cot="Cotiza">
   <soapenv:Header/>
   <soapenv:Body>
      <cot:wsbcucotizaciones.Execute>
         <cot:Entrada>
            <cot:Moneda>
               <cot:item>${BCU_USD_CURRENCY_CODE}</cot:item>
            </cot:Moneda>
            <cot:FechaDesde>${fechaDesde}</cot:FechaDesde>
            <cot:FechaHasta>${fechaHasta}</cot:FechaHasta>
            <cot:Grupo>0</cot:Grupo>
         </cot:Entrada>
      </cot:wsbcucotizaciones.Execute>
   </soapenv:Body>
</soapenv:Envelope>`;
}

async function getBcuUsdRate(): Promise<UsdRate | null> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 10);

  let xml: string;
  try {
    const res = await fetch(BCU_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=UTF-8" },
      body: buildBcuSoapRequest(isoDate(from), isoDate(today)),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    xml = await res.text();
  } catch {
    return null;
  }

  const entries = [...xml.matchAll(/<datoscotizaciones\.dato[^>]*>([\s\S]*?)<\/datoscotizaciones\.dato>/g)];
  if (entries.length === 0) return null;

  const last = entries[entries.length - 1][1];
  const fecha = last.match(/<Fecha>([^<]*)<\/Fecha>/)?.[1];
  const tcc = last.match(/<TCC>([^<]*)<\/TCC>/)?.[1];
  const tcv = last.match(/<TCV>([^<]*)<\/TCV>/)?.[1];
  if (!fecha || !tcc || !tcv) return null;

  const compra = Number(tcc);
  const venta = Number(tcv);
  if (!Number.isFinite(compra) || !Number.isFinite(venta) || venta <= 0) return null;

  return { source: "BCU", compra, venta, date: fecha };
}

// --- copia de resguardo -------------------------------------------------

/**
 * La última cotización buena, guardada en la base.
 *
 * Antes, si BROU y BCU fallaban a la vez, `getUsdRate` devolvía null y se
 * apagaban el conversor entero y la torta del resumen anual. Una cotización de
 * ayer sirve muchísimo más que ninguna, siempre que se diga que es de ayer.
 *
 * Todo va envuelto en try/catch a propósito: si la tabla todavía no existe
 * porque falta correr la migración, la app se comporta como antes en vez de
 * romperse.
 */
async function guardarCotizacion(rate: UsdRate) {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.usdRateCache.upsert({
      where: { id: "actual" },
      create: { id: "actual", source: rate.source, compra: rate.compra, venta: rate.venta, date: rate.date },
      update: { source: rate.source, compra: rate.compra, venta: rate.venta, date: rate.date },
    });
  } catch {
    // Sin copia de resguardo se sigue andando igual.
  }
}

async function cotizacionGuardada(): Promise<UsdRate | null> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const fila = await prisma.usdRateCache.findUnique({ where: { id: "actual" } });
    if (!fila) return null;
    return {
      source: fila.source === "BCU" ? "BCU" : "BROU",
      compra: Number(fila.compra),
      venta: Number(fila.venta),
      date: fila.date,
      leidaEl: fila.updatedAt,
      vieja: true,
    };
  } catch {
    return null;
  }
}

// --- API pública --------------------------------------------------------

export async function getUsdRate(): Promise<UsdRate | null> {
  const fresca = (await getBrouUsdRate()) ?? (await getBcuUsdRate());

  if (fresca) {
    // Sin await: refrescar la copia no tiene por qué demorar la página.
    void guardarCotizacion(fresca);
    return fresca;
  }

  return cotizacionGuardada();
}

/**
 * Cotización a guardar junto a un gasto en dólares, en el momento de crearlo.
 *
 * Devuelve null en gastos en pesos (no hay nada que convertir) y también si la
 * fuente no responde: cargar un gasto nunca puede fallar porque BROU esté
 * caído. Un gasto sin cotización propia se convierte después con la de hoy.
 *
 * Acá no se acepta la copia de resguardo. Sirve para mostrar, pero grabarla
 * junto al gasto sería dejar escrita como "la cotización de ese día" una que
 * puede ser de la semana pasada.
 */
export async function rateParaGuardar(currency: "UYU" | "USD"): Promise<number | null> {
  if (currency !== "USD") return null;
  try {
    const rate = await getUsdRate();
    if (!rate || rate.vieja || rate.venta <= 0) return null;
    return rate.venta;
  } catch {
    return null;
  }
}
