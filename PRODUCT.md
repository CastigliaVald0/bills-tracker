# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Público general en Uruguay que quiere saber en qué se le va la plata cada mes, en pesos y en dólares. Lo usan sobre todo desde el celular, con la app instalada (PWA), para anotar un gasto en el momento y mirar cómo va el mes. También lo usan grupos de amigos o familia que comparten gastos.

## Product Purpose
Anotar cada gasto (monto, moneda, fecha, categoría) y que la app arme sola los totales, los gráficos y la comparación con meses anteriores, sin planillas. Funciona bien si la persona sabe en segundos cuánto lleva gastado en el mes en cada moneda y no se olvida de los gastos fijos.

## Positioning
- Pesos y dólares por separado: las dos monedas no se suman (salvo en el gráfico anual "todo junto") y cada gasto en dólares guarda la cotización de su día, así los meses pasados no cambian.
- Pensada para Uruguay: cotización del BROU con respaldo del BCU, formatos uruguayos y acceso a la app del banco en Android.
- Gastos fijos y en cuotas que se cargan solos el día elegido (1–28), se pueden pausar y dejan de cargarse con la última cuota.
- Grupos con amigos al estilo Tricount: gastos compartidos, saldos, metas de ahorro y código de amigo.

## Operating Context
Inicio con el total del mes por moneda, las categorías y los últimos gastos. Gastos (comunes, fijos y grupales en pestañas), categorías, resumen mensual y anual, conversor UYU/USD, amigos y grupos. Resumen por mail o push el día 1 de cada mes y el 1 de enero. El endpoint `/api/central/resumen` alimenta el sistema Central.

## Capabilities and Constraints
- Celular primero: cada pantalla se diseña primero para el teléfono (barra flotante, cajón, hojas modales); la PC es la adaptación.
- Next.js 16, Prisma y NextAuth v5, con deploy en Vercel.
- Siete categorías iniciales; las que crea la persona llevan el color que elige.
- Textos en español del Uruguay.

## Brand Commitments
- Nombre: Billions Tracker.
- El peso y el dólar tienen cada uno su color y nunca lo comparten (celeste y verde). Ese par se mantiene en cualquier rediseño.
- Solo tema oscuro.

## Evidence on Hand
README.md con la descripción de las funciones. No hay testimonios, cifras de uso ni precios: no inventarlos.

## Product Principles
1. Las dos monedas se ven siempre por separado y se reconocen de un vistazo.
2. Cargar un gasto desde el celular tiene que ser lo más rápido de la app.
3. Lo que se repite se carga solo; la persona no hace cuentas a mano.
4. Los números del pasado no cambian.
