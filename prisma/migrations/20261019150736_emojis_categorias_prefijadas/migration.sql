-- Las categorías que trae una cuenta nueva mostraban un ícono dibujado que
-- se elegía por el nombre. Los íconos se reemplazaron por emojis guardados en
-- la categoría, así que las cuentas que ya existían reciben el emoji
-- equivalente. Solo las que conservan el nombre original y no tienen emoji
-- propio: si alguien la renombró o ya le puso su emoji, no se toca (la misma
-- regla que usaban los íconos).
UPDATE "Category" AS c
SET "emoji" = e.emoji
FROM (VALUES
  ('Alimentación', '🍽️'),
  ('Transporte', '🚗'),
  ('Vivienda', '🏠'),
  ('Servicios', '💡'),
  ('Ocio', '🎉'),
  ('Salud', '💊'),
  ('Otros', '📦'),
  ('Gastos grupales', '👥')
) AS e(nombre, emoji)
WHERE c."name" = e.nombre
  AND c."emoji" IS NULL;
