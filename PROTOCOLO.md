# Protocolo de trabajo en la web (Next.js + TypeScript)

Convenciones obligatorias al modificar este repositorio. (Adaptado del `PROTOCOLO.md` del pipeline de
datos, que cubre los scripts de Python.)

## OBLIGATORIO antes de cualquier modificación

1. **Backup primero.** Antes de tocar un archivo existente, copiarlo:

   ```bash
   cp src/app/globals.css src/app/globals.css.bak
   ```

   Los `*.bak` están en `.gitignore`, así que no ensucian el árbol. Se borran al terminar, una vez
   verificado. Crear archivos nuevos no necesita backup.

2. **Nunca escribir archivos con PowerShell** (`Set-Content` / `Out-File` / `>`). PowerShell 5.1 usa
   cp1252 y corrompe el UTF-8 (acentos, `—`, `x̄`, emojis). Editar solo con las herramientas del editor,
   que escriben UTF-8 con saltos `\n`.

## Verificar antes de CADA commit

3. Comprobar SIEMPRE, en este orden, y que los tres terminen sin error:

   ```bash
   npx tsc --noEmit      # tipos
   npm run test          # tests (Vitest)
   npm run build         # build de producción
   ```

4. **No arrancar el servidor** (`next dev` / `next start`) como parte de la verificación. El build es
   suficiente; el servidor local, además, no es fiable aquí (antivirus que rompe la hidratación).

## Alcance del commit

5. **Un commit contiene solo lo pedido.** No colar cambios no solicitados —ni siquiera limpieza,
   reformateos o «de paso»— en el mismo commit. Si aparece basura o algo que arreglar al margen de la
   tarea, se comenta aparte y, si procede, va en su propio commit.

6. Si algo obliga a tocar un archivo existente que no estaba en el encargo, **pararse y avisar antes**
   de hacerlo.

## Recuperación

7. Si algo se rompe, restaurar desde el backup o desde git:

   ```bash
   cp src/app/globals.css.bak src/app/globals.css   # o: git checkout -- <archivo>
   ```

---

## Paleta y color

La web tiene un **código de color con significado**; no se improvisa.

### Escala de rendimiento — 5 escalones (`src/lib/escala.ts`)

| Escalón | Semántica | Texto | Hex | Contraste s/ `pitch-900` | Fondo |
|--------:|-----------|-------|-----|:-:|-------|
| 0 | negativo   | `text-red-400`    | `#f87171` | 6,55:1  | `bg-red-400/20`    |
| 1 | bajo       | `text-slate-400`  | `#94a3b8` | 7,07:1  | `bg-slate-400/20`  |
| 2 | medio      | `text-grass-400`  | `#22a050` | 5,36:1  | `bg-grass-400/20`  |
| 3 | alto       | `text-grass-200`  | `#2ee56b` | 10,82:1 | `bg-grass-200/25`  |
| 4 | muy alto   | `text-grass-100`  | `#8cf0a2` | 13,04:1 | `bg-grass-100/30`  |

- **Un único rojo** (escalón 0 = negativo). El azul-pizarra frío (`slate-400`) es el «bajo», neutro y
  apagado, para no competir con el azul de las pastillas de competición.
- **Rampa verde progresiva.** Usa `grass-400` + los dos tonos nuevos `grass-200` (`#2ee56b`) y `grass-100`
  (`#8cf0a2`). Se **salta `grass-300`** a propósito: quedaba casi idéntico a `grass-400` y un 2 y un 3 no
  se distinguían en una barra de 24px. **No se tocan `grass-300/400/500`** (siguen en uso en el resto del
  sitio); `grass-300` sigue siendo color del sistema, solo que la escala ya no lo usa.
- Los cinco tonos de **texto** superan **4,5:1** de contraste sobre `pitch-900` (`#0a1628`); el más
  ajustado es el escalón 2 (5,36:1).
- El **escalón 0 es solo para valores negativos** (`valor < 0`). Un 0 real (p. ej. 0 puntos en un partido)
  cae en el escalón 1, nunca en rojo.
- Los mapas de clases son **literales completas**: el JIT de Tailwind purga cualquier clase construida
  por concatenación (`text-${x}`), así que nunca se ensamblan a trozos.

### Percentiles vs. umbrales fijos

**Los percentiles (por categoría y temporada) solo se aplican a métricas continuas:** la **media de
puntos** y el **ELO**. Los **puntos de un partido** usan **umbrales fijos** (`CORTES_FIJOS.puntosPartido`),
porque son enteros pequeños y su distribución no admite cinco escalones separados: los percentiles reales
salen empatados (p. ej. P20=1, P40=1, P60=2, P80=4) y producirían una rampa degenerada. Antes de pintar con
cortes venidos del pipeline, validar con `cortesValidos()` y, si son degenerados, caer a `CORTES_FIJOS`.

### El ámbar está reservado

**El ámbar (`amber-*`) NO se usa nunca como escalón de rendimiento.** En el resto del sitio significa:

- **playoff** (zonas de clasificación, sellos),
- **copa**,
- **estado disciplinario** («en ciclo de amarillas»).

Reutilizarlo para «rendimiento medio/alto» rompería ese código de color. El «medio» de la escala es
verde, no ámbar.
