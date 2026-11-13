---
target: cómo se carga un gasto
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/vald0/Documents/Co-Work/bills-tracker/src/components/NuevoGasto.tsx"
target_fingerprint: "sha256:21200afb8931bdecd6ba5c04d458207a6332e62bd6543399ba35b929b67cd682"
target_path: /home/vald0/Documents/Co-Work/bills-tracker/src/components/NuevoGasto.tsx
timestamp: 2026-11-13T23-38-14Z
slug: src-components-nuevogasto-tsx
---
# Crítica: cómo se carga un gasto (src/components/NuevoGasto.tsx)

Method: dual-agent

| # | Heurística | Puntaje | Problema |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | El gasto nuevo aparece en una fila fuera de pantalla en el celular |
| 2 | Mundo real | 3 | Error de monto vacío con el globo del navegador, en el idioma del sistema |
| 3 | Control y libertad | 2 | Sin deshacer; ticket bloquea 3 s; Grupal pierde el monto; fondo no cierra |
| 4 | Consistencia | 3 | Dos sistemas de error; las dos hojas se cierran distinto |
| 5 | Prevención de errores | 3 | Categoría por defecto alfabética |
| 6 | Reconocer | 3 | Sin categorías recientes |
| 7 | Eficiencia | 1 | Sin foco en el monto, sin enviar desde el teclado, sin última categoría, sin "cargar otro" |
| 8 | Estética y mínimo | 3 | Cinco bloques para un gasto rápido |
| 9 | Recuperación de errores | 2 | Error de vacío sin texto propio; el de cero lejos del campo |
| 10 | Ayuda | 3 | Buenos textos de ayuda |
| Total | | 26/40 | Aceptable |

Detector: revisión estática limpia. En la página: placeholder "0,00" 3,95:1; renglón huérfano en Fijo.

## Problemas prioritarios
1. [P1] Al abrir no enfoca el monto; el teclado decimal del iPhone no tiene tecla para enviar. Arreglo: foco en #monto-nuevo después de la animación, enterKeyHint, botón de guardar sobre el teclado.
2. [P1] Categoría por defecto = primera alfabética. Arreglo: la última usada o la más frecuente + fila de recientes.
3. [P1] Monto vacío usa la validación nativa del navegador. Arreglo: noValidate, aviso bajo el monto, campo en rojo o botón deshabilitado.
4. [P2] Selector de tipo primero, 94px. Arreglo: monto primero, conmutador chico, "Hoy ▾", "+ Nota".
5. [P2] Sin deshacer; el ticket bloquea 3 s. Arreglo: Deshacer y Cargar otro en el ticket, ~1,8 s; pasar el monto a Grupal.

## Menores
"Día del mes" sin inputMode numeric; categoría repetida sin descripción; "Gastos grupales" junto a la pestaña Grupal; Cancelar redundante; foco no vuelve al + al cerrar con Escape; ✕ 28×30 en PC.
