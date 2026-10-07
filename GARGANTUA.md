# Página 7 · Gargantua

El séptimo capítulo se abre desde la navegación del álbum. Funciona con módulos ES nativos y WebGL 2, con alternativa WebGL 1. No añade bibliotecas, imágenes, texturas ni solicitudes a servicios externos. Basta servir el repositorio por HTTP o publicarlo en GitHub Pages.

## Archivos

- `index.html`: capítulo, canvas y controles accesibles.
- `css/style.css`: composición inmersiva, aislamiento y adaptación a pantallas pequeñas.
- `js/app.js`: navegación y carga diferida del renderizador.
- `gargantua.js`: shaders y ciclo de vida de GPU.

## Imagen

Un quad de dos triángulos ejecuta hasta 190 pasos de integración por fragmento. Los rayos se curvan con una aproximación gravitacional central que conserva el momento angular. Sus cruces con el plano del disco producen la imagen primaria y las imágenes curvadas posteriores. Es una aproximación visual inspirada en Schwarzschild, no un simulador científico de Kerr.

El disco usa ruido fBM animado, bandas radiales, ondas de choque y rotación kepleriana diferencial. Filamentos volumétricos y concentraciones luminosas espiralan hacia dentro con velocidad creciente y estelas radiales. La emisión combina corrimiento gravitacional al rojo y beaming Doppler calculado con la dirección local del rayo. El anillo de fotones pulsa con el tiempo. Los rayos capturados terminan en negro opaco; los restantes muestran emisión y estrellas procedurales en su dirección desviada.

## Controles y recursos

Arrastrar con ratón, lápiz o un dedo permite orbitar en cualquier dirección. Los cuaterniones mantienen una base ortonormal al atravesar los polos y permiten giros completos sin bloqueo de ejes. La cámara interpola su orientación y distancia con amortiguación temporal; al soltar el arrastre, la velocidad angular decae suavemente.

La rueda, el pellizco y el deslizador Distancia ajustan la distancia entre 1,8 y 45 radios del horizonte. El límite cercano permanece fuera de la esfera de fotones de esta aproximación, situada a 1,5 radios. El FOV se amplía durante el acercamiento y el encuadre se ajusta suavemente en vistas cenitales. Los uniforms `u_cameraPos`, `u_cameraRot`, `u_zoom` y `u_time` controlan la proyección y la simulación.

Con el canvas enfocado, las flechas orbitan, + y − acercan y alejan, y la tecla Inicio restablece la vista. Escape vuelve al océano; el botón Inicio regresa al primer capítulo. Pausar materia congela el plasma, pero permite seguir explorando con la cámara. Cuando termina la amortiguación, el bucle pausado vuelve a quedar detenido. La preferencia de movimiento reducido inicia la materia pausada y aplica los cambios de cámara directamente, sin inercia.

El canvas usa `touch-action: none`; sus gestos están excluidos de la navegación por deslizamiento. Los eventos táctiles se procesan por separado de los Pointer Events de ratón y lápiz para evitar movimientos duplicados. El paso entre uno y dos dedos reinicia la referencia del gesto sin saltos. Una cancelación, pérdida de foco o salida del capítulo limpia los contactos y capturas.

El bucle solo se ejecuta mientras el capítulo está activo y la pestaña está visible. Al salir se cancelan los frames, se desvinculan y eliminan el programa y el buffer, y se reduce el canvas a un píxel. Una restauración de contexto fuera del capítulo no recrea recursos hasta volver a entrar. El océano se descarga al cambiar de capítulo. El visualizador de audio de Idiomas también deja de dibujar cuando no se ve, sin interrumpir la música.

## Rendimiento y validación

El DPR está limitado a 2. El presupuesto inicial es de 420.000 píxeles en pantallas menores de 768 px y de 960.000 en escritorio. La resolución desciende si el promedio de 90 frames supera 19,5 ms; la simulación avanza por tiempo transcurrido. El encuadre reserva espacio para título y controles.

En una prueba de 5,5 segundos con órbita y zoom continuos, WebGL 2 registró 60 FPS a un viewport de 1440 × 900: promedio de 16,69 ms y percentil 95 de 16,8 ms, con buffer de 1239 × 775. Se revisó también la vista de 390 × 844; son pruebas en el equipo de desarrollo, no mediciones en hardware móvil. Los 60 FPS son el objetivo adaptativo, no una garantía para todas las GPU.

Se comprobaron compilación y píxeles renderizados en WebGL 1 y 2, ausencia de errores GL, pausa, liberación y reentrada, pérdida/restauración de contexto activa e inactiva, y respaldo sin WebGL. Las pruebas de interacción cubren arrastre real de ratón, teclado, límites de zoom, normalización tras múltiples vueltas y eventos táctiles sintéticos de arrastre, pellizco, transición a un dedo y cancelación. También se verificó que los píxeles de plasma cambien con el tiempo y que una cámara en pausa deje de pedir frames al estabilizarse. Las rutas de audio y la lógica existente de secretos se conservaron. Los archivos HTML, CSS y JS del proyecto no contienen comentarios de código.
