import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Sin esto, vitest no resuelve el alias `@/` y SOLO se pueden testear módulos que no lo usen — que es por lo
// que la batería cubría cuatro ficheros sueltos y la lógica de la ficha (ventanas de forma, rachas) se
// quedaba fuera. Es config de test: no toca el build, que resuelve el alias por tsconfig.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
