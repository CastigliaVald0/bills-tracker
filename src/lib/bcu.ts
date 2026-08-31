const BCU_ENDPOINT = "https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones";
const USD_CURRENCY_CODE = "2225";

export type BcuRate = {
  date: string;
  compra: number;
  venta: number;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildSoapRequest(fechaDesde: string, fechaHasta: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cot="Cotiza">
   <soapenv:Header/>
   <soapenv:Body>
      <cot:wsbcucotizaciones.Execute>
         <cot:Entrada>
            <cot:Moneda>
               <cot:item>${USD_CURRENCY_CODE}</cot:item>
            </cot:Moneda>
            <cot:FechaDesde>${fechaDesde}</cot:FechaDesde>
            <cot:FechaHasta>${fechaHasta}</cot:FechaHasta>
            <cot:Grupo>0</cot:Grupo>
         </cot:Entrada>
      </cot:wsbcucotizaciones.Execute>
   </soapenv:Body>
</soapenv:Envelope>`;
}

/** Latest published USD/UYU rate from the Banco Central del Uruguay's public web service. */
export async function getLatestUsdRate(): Promise<BcuRate | null> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 10);

  const body = buildSoapRequest(isoDate(from), isoDate(today));

  let xml: string;
  try {
    const res = await fetch(BCU_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=UTF-8" },
      body,
      next: { revalidate: 21600 },
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
  if (!Number.isFinite(compra) || !Number.isFinite(venta)) return null;

  return { date: fecha, compra, venta };
}
