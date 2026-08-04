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

| Escalón | Semántica | Texto | Hex | Fondo |
|--------:|-----------|-------|-----|-------|
| 0 | negativo   | `text-red-400`    | `#f87171` | `bg-red-500/20`   |
| 1 | bajo       | `text-slate-400`  | `#94a3b8` | `bg-slate-500/20` |
| 2 | medio      | `text-grass-400`  | `#22a050` | `bg-grass-500/20` |
| 3 | alto       | `text-grass-300`  | `#2dc768` | `bg-grass-400/25` |
| 4 | muy alto   | `text-green-300`  | `#86efac` | `bg-grass-300/30` |

- **Un único rojo** (escalón 0 = negativo). El azul-pizarra frío (`slate-400`) es el «bajo», neutro y
  apagado, para no competir con el azul de las pastillas de competición.
- La rampa de **texto** se distingue por **tono, no por legibilidad**: los cinco tonos superan **4,5:1**
  de contraste sobre `pitch-900` (`#0a1628`). Un valor medio se lee igual de cómodo que uno alto.
- Los mapas de clases son **literales completas**: el JIT de Tailwind purga cualquier clase construida
  por concatenación (`text-${x}`), así que nunca se ensamblan a trozos.

### El ámbar está reservado

**El ámbar (`amber-*`) NO se usa nunca como escalón de rendimiento.** En el resto del sitio significa:

- **playoff** (zonas de clasificación, sellos),
- **copa**,
- **estado disciplinario** («en ciclo de amarillas»).

Reutilizarlo para «rendimiento medio/alto» rompería ese código de color. El «medio» de la escala es
verde, no ámbar.
