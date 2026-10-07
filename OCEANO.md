# Capítulo 6 · Nuestro océano

La página 6 amplía el álbum existente; no sustituye las primeras cinco páginas ni el rincón secreto. No utiliza fotografías.

## Archivos

- `index.html`: añade el sexto botón, sección e iframe.
- `js/app.js`: carga `oceano.html` al entrar en la página 6 y descarga el iframe al salir, liberando la escena GPU.
- `css/style.css`: ajusta la navegación a seis capítulos y da tamaño al iframe.
- `oceano.html`: estructura de la experiencia, canvas, modal nativo e import map.
- `style.css`: estilos aislados del océano, interfaz adaptable y modal de cristal.
- `main.js`: escena Three.js, shaders GLSL, raycasting, OrbitControls, bloom, cámara GSAP y estados de la interfaz.
- `recuerdos.js`: títulos, fechas descriptivas y mensajes editables de las cinco perlas.

## Ejecutar y publicar

Se sirve como cualquier web estática, sin npm, Vite ni compilación. Abrir con Live Server o, desde la raíz del repo, `python -m http.server 4174`, y visitar `http://localhost:4174/`. No abrir con `file://`: los módulos necesitan HTTP/HTTPS.

GitHub Pages publica los archivos de la misma manera que el álbum anterior. Todas las rutas locales son relativas, compatibles con `/album-nosotros/`. Después del commit y push, esperar a que termine el despliegue de Pages.

Three.js está fijado a 0.180.0 y todos sus addons usan esa misma versión. GSAP está fijado a 3.13.0. Se cargan desde jsDelivr; las fuentes desde Google Fonts, con alternativas locales. No hay analítica ni envíos de respuestas o textos.

## Escena

Fondo abisal `#030b14`, niebla exponencial, luz de hemisferio y luz superior. Composer: RenderPass → UnrealBloomPass (strength 1.25, radius 0.5, threshold 0.22) → OutputPass. ACES tone mapping y salida sRGB.

Las medusas usan campanas deformadas por GLSL y filamentos ondulantes. El suelo usa interferencias para simular cáusticas. Rayos de luz transparentes, partículas de nieve marina, burbujas y algunos corazones se generan sin texturas remotas. Las perlas usan Fresnel e iluminación procedural.

Ratón: arrastrar para orbitar, rueda para zoom, clic en perla o su etiqueta. Móvil: arrastre de un dedo, pinza de dos dedos y toque. Un arrastre o una pinza no debe abrir un recuerdo. Los cinco botones inferiores permiten acceder sin apuntar a objetos 3D y funcionan también con teclado.

La cámara viaja con GSAP, bloquea OrbitControls durante la visita y vuelve al panorama al cerrar el modal (botón, Escape o fondo). El modal nativo mantiene el foco dentro y la interfaz devuelve el foco al salir.

Modo ligero: DPR máximo 1, 450 partículas y cinco medusas; modo normal: DPR máximo 1.6, 950 partículas y ocho medusas. Bloom permanece en ambos. Animaciones pausables; `prefers-reduced-motion` inicia el agua inmóvil y evita viajes animados. Se suspende el render al ocultar la pestaña. Al salir de la página 6 se liberan geometrías, materiales, render targets, controles y animaciones.

Si falla WebGL, se pierde su contexto o el CDN tarda más de 20 segundos, aparece una vista estática y las cinco perlas siguen disponibles desde los botones inferiores. El contenido no depende de Three.js para poder leerse.

## Editar recuerdos

Cambiar `title`, `short`, `date` y `text` en `recuerdos.js`. Se presentan como texto con `textContent`; se admiten saltos de línea con `\n`. Las fechas de las cartas son descripciones, no fechas inventadas. El inicio del álbum se mantiene en 10-12-2022.

Se conservan la carta original, las diez razones y el mensaje de ánimo. La página 2 contiene 40 idiomas, con búsqueda por idioma o frase que ignora mayúsculas y acentos. La segunda perla incluye esos mismos idiomas. La escena no contiene fotografías ni campos de carga de imágenes.

## Refinamiento visual

El encabezado de cada recuerdo muestra una perla SVG animada junto al número; esta ilustración funciona también sin WebGL. Flotación, órbita y destellos se pausan con el agua o con movimiento reducido. La tipografía de títulos es Bodoni Moda, con Palatino/Georgia como alternativa. El panel reserva espacio para la perla y permite desplazar únicamente el texto, incluso en pantallas estrechas o de poca altura.

Los viajes usan curvas sinusoidales de 2.1 segundos. Cambiar al siguiente recuerdo también interpola la cámara y hace una transición suave del texto. El brillo y la velocidad del agua son menores. Si 150 fotogramas medidos tardan una media superior a 29 ms, se activa el modo ligero para reducir la carga de renderizado.

Referencias: https://threejs.org/docs/pages/OrbitControls.html · https://threejs.org/docs/pages/UnrealBloomPass.html · https://gsap.com/docs/v3/GSAP/gsap.to()/

## Validación de esta entrega

Pasaron las comprobaciones de sintaxis, rutas locales, IDs únicos, conservación exacta de las cinco secciones originales y del rincón secreto, apertura/cambio/cierre de recuerdos, restitución del foco, cancelación de un viaje pendiente y lectura sin WebGL. Estas pruebas de lógica se ejecutaron con un DOM simulado; no equivalen a una prueba visual o GPU.

Pendiente: comprobar en un navegador real la compilación GLSL, el encuadre, el rendimiento, el raycasting y los gestos táctiles. La vista integrada de esta sesión no pudo conectar al servidor local y bloqueó archivos `file://`. Para esa comprobación, servir el proyecto con Live Server, entrar en «06 · Océano», probar las cinco perlas, Escape, pausa, modo ligero y salir/volver al capítulo. Repetir en escritorio y móvil.

## El océano recuerda

La página 6 tiene un recorrido persistente en este navegador, guardado únicamente bajo la clave local `album-nosotros.ocean-journey.v1`. Se cuentan perlas únicas cuando su contenido llega a mostrarse. Al cerrar el último recuerdo se inicia el encuentro; revisitar una perla no aumenta el progreso. Si el almacenamiento está bloqueado, funciona durante esa visita. «Empezar otra vez» pide confirmar y reinicia solo este recorrido.

Cada descubrimiento activa una capa: corales luminosos, peces instanciados, flores marinas, corrientes y polen dorado. Las perlas visitadas conservan un halo dorado; un hilo con partículas acompaña hacia una pendiente. Las dos medusas protagonistas se acercan gradualmente.

Después de las cinco perlas, la cámara encuadra a la pareja y doce filamentos se transforman en dos mitades entrelazadas de un corazón. La frase se descubre en cinco partes: «Entre tantas corrientes, volvería a encontrarte.». El encuentro puede pausarse, saltarse, cancelarse, repetirse o contemplarse con la interfaz oculta. «Mostrar controles» y Escape permiten salir de la contemplación. El progreso se conserva al abandonar la página 6.

`ocean-journey.js` contiene el estado persistente y su validación. `ocean-life.js` construye el paisaje y el encuentro procedural. Ambos se integran desde `main.js`. Con movimiento reducido el encuentro muestra directamente el estado final; sin WebGL se ofrece una ilustración SVG y los mismos mensajes y controles.
