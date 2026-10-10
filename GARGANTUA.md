# Página 7 · Gargantua

El séptimo capítulo se abre desde la navegación del álbum. Funciona con módulos ES nativos y WebGL 2, con alternativa WebGL 1. No añade bibliotecas, imágenes, texturas ni solicitudes a servicios externos. Basta servir el repositorio por HTTP o publicarlo en GitHub Pages.

## Archivos

- `index.html`: capítulo, canvas y controles accesibles.
- `css/style.css`: composición inmersiva, aislamiento y adaptación a pantallas pequeñas.
- `js/app.js`: navegación y carga diferida del renderizador.
- `gargantua.js`: shaders y ciclo de vida de GPU.
- `gargantua-experience.js`: señal por alineación, estrellas lanzadas, modo cine y conexión con el océano.

## Imagen

Un quad de dos triángulos ejecuta hasta 160 pasos de integración por fragmento. Los rayos se curvan con una aproximación gravitacional central que conserva el momento angular. Sus cruces con el plano del disco producen la imagen primaria y las imágenes curvadas posteriores. Es una aproximación visual inspirada en Schwarzschild, no un simulador científico de Kerr.

El disco usa ruido fBM animado, bandas radiales, ondas de choque y rotación kepleriana diferencial. Cintas trianguladas y concentraciones luminosas espiralan hacia dentro con velocidad creciente. La emisión combina corrimiento gravitacional al rojo y beaming Doppler calculado con la dirección local del rayo. El anillo de fotones pulsa con el tiempo. Los rayos capturados eliminan el fondo; conservan la emisión del material que atraviesan por delante de la sombra. Los restantes muestran emisión y estrellas procedurales en su dirección desviada.

## Controles y recursos

Arrastrar con ratón, lápiz o un dedo permite orbitar en cualquier dirección. Los cuaterniones mantienen una base ortonormal al atravesar los polos y permiten giros completos sin bloqueo de ejes. La cámara interpola su orientación y distancia con amortiguación temporal; al soltar el arrastre, la velocidad angular decae suavemente.

La rueda, el pellizco y el deslizador Distancia ajustan la distancia entre 1,8 y 45 radios del horizonte. El límite cercano permanece fuera de la esfera de fotones de esta aproximación, situada a 1,5 radios. El FOV se amplía durante el acercamiento y el encuadre se ajusta suavemente en vistas cenitales. Los uniforms `u_cameraPos`, `u_cameraRot`, `u_zoom` y `u_time` controlan la proyección y la simulación.

Con el canvas enfocado, las flechas orbitan, + y − acercan y alejan, y la tecla Inicio restablece la vista. Escape vuelve al océano; el botón Inicio regresa al primer capítulo. Pausar materia congela el plasma, pero permite seguir explorando con la cámara. Cuando termina la amortiguación, el bucle pausado vuelve a quedar detenido. La preferencia de movimiento reducido inicia la materia pausada y aplica los cambios de cámara directamente, sin inercia.

El canvas usa `touch-action: none`; sus gestos están excluidos de la navegación por deslizamiento. Los eventos táctiles se procesan por separado de los Pointer Events de ratón y lápiz para evitar movimientos duplicados. El paso entre uno y dos dedos reinicia la referencia del gesto sin saltos. Una cancelación, pérdida de foco o salida del capítulo limpia los contactos y capturas.

El bucle solo se ejecuta mientras el capítulo está activo y la pestaña está visible. Al salir se cancelan los frames, se desvinculan y eliminan el programa y el buffer, y se reduce el canvas a un píxel. Una restauración de contexto fuera del capítulo no recrea recursos hasta volver a entrar. El océano se descarga al cambiar de capítulo. El visualizador de audio de Idiomas también deja de dibujar cuando no se ve, sin interrumpir la música.

## Experiencias

Buscar señal muestra dos estrellas situadas en coordenadas 3D diferentes. La coincidencia se calcula con su proyección sobre la cámara actual; deben mantenerse a menos de 6 píxeles o del 0,9 % del ancho durante 0,85 segundos, sin arrastre activo. Seguir la señal orienta la cámara hacia una posición que permite encontrarlas. La frase revelada es «Incluso aquí, volvería a encontrarte». El descubrimiento se recuerda mientras el documento sigue abierto.

Un toque breve, un clic, Enter sobre el canvas o Lanzar estrella crea una luz con una trayectoria espiral acelerada hacia el horizonte. Arrastrar, pellizcar o cancelar un contacto no lanza estrellas. Se conservan como máximo seis luces, con 72 muestras analíticas por estela y dos cintas trianguladas de distinto grosor; una máscara de oclusión evita dibujarlas sobre la sombra cuando están detrás. Las estrellas lanzadas terminan su viaje aunque el plasma esté pausado.

Modo cine oculta los controles y el reproductor, elimina su acceso por teclado y recorre el agujero negro con una cámara lenta. Salir del modo cine, Escape o interactuar con el canvas devuelve los controles. La reproducción musical continúa y se restaura la pausa del plasma que había antes. Con movimiento reducido, el modo cine conserva una cámara estática.

Las perlas abiertas se leen del mismo estado local que utiliza el océano. Cada una enciende una estrella dorada y aparece en la lista Del océano al cielo. El capítulo no modifica ese progreso. La lista se actualiza al volver a entrar y ante cambios de almacenamiento de otra ventana. Seguir en el océano vuelve al capítulo 6.

Todas las experiencias comparten el único bucle y el mismo contexto WebGL. `gargantua-cinematic.js` dibuja las luces como geometría en coordenadas 3D, con sprites orientados a cámara y cintas trianguladas para las estelas. Los fragmentos se ocultan tras la sombra central. Las perlas tienen sombreado de superficie, brillo de borde y pequeños satélites. Una nube de 420 partículas aporta paralaje y 30 corrientes de materia siguen cayendo hacia el centro. El recorrido del modo cine combina órbita, elevación y acercamiento lentos. La aparición de paneles y los cambios de encuadre usan transiciones suaves.

La imagen y la geometría se componen antes del resplandor. El postprocesado usa dos escalas de desenfoque gaussiano, mapeo tonal fílmico, corrección gamma y dithering final. Las cinco superficies de render usan media precisión flotante cuando el dispositivo lo admite; el respaldo usa RGBA de 8 bits. No se añaden librerías. Al salir se eliminan texturas, framebuffers, programas y buffers, se vacían las trayectorias, se cierra el modo cine y se restaura el reproductor. El canvas se reduce a un píxel. La restauración de contexto reconstruye el pipeline completo.

## Rendimiento y validación

El DPR está limitado a 2. El presupuesto inicial es de 420.000 píxeles en pantallas menores de 768 px y de 820.000 en escritorio. La resolución desciende si el promedio de 90 frames supera 19,5 ms y se recupera gradualmente tras cuatro ventanas estables por debajo de 17,4 ms; la simulación avanza por tiempo transcurrido. El encuadre reserva espacio para título y controles.

En una prueba de la implementación base, de 5,5 segundos con órbita y zoom continuos, WebGL 2 registró 60 FPS a un viewport de 1440 × 900: promedio de 16,69 ms y percentil 95 de 16,8 ms, con buffer de 1239 × 775. Con las experiencias se volvió a comprobar la vista de 390 × 844 y se observaron 60 FPS. Son pruebas en el equipo de desarrollo, no mediciones en hardware móvil. Los 60 FPS son el objetivo adaptativo, no una garantía para todas las GPU.

Se comprobaron compilación y píxeles renderizados en WebGL 1 y 2, ausencia de errores GL, pausa, liberación y reentrada, pérdida/restauración de contexto activa e inactiva, y respaldo sin WebGL. Las pruebas de interacción cubren arrastre real de ratón, teclado, límites de zoom, normalización tras múltiples vueltas y eventos táctiles sintéticos de arrastre, pellizco, transición a un dedo y cancelación. También se verificó que los píxeles de plasma cambien con el tiempo y que una cámara en pausa deje de pedir frames al estabilizarse. Las rutas de audio y la lógica existente de secretos se conservaron. Los archivos HTML, CSS y JS del proyecto no contienen comentarios de código.

Las pruebas de experiencias pasan en WebGL 1 y 2: alineación real y revelado, límite de luces, caída monótona hasta el horizonte, limpieza de estelas, cámara y accesibilidad del modo cine, restauración de pausa, una sola solicitud de frame pendiente, salida y reentrada, recuperación de contexto y conservación del progreso del océano.

## Refinamiento del 10 de octubre de 2026

Se sustituyó la capa 2D de las experiencias por geometría WebGL, se suavizaron las bandas del disco y se integró su luz con el resplandor de estrellas y estelas. La integración de rayos usa hasta 160 pasos adaptativos y descarta temprano los rayos alejados del disco. La órbita sigue usando cuaterniones y conserva la navegación y los controles existentes.

En la medición aislada de WebGL 2, 180 frames dieron un promedio de 16,89 ms y un percentil 95 de 17,60 ms, con envío de geometría y comandos de 1,54 ms de media. La escena real también registró 60 FPS a 1440 × 900 con escala de render de 0,80. Son mediciones del equipo de desarrollo, no una garantía para todos los dispositivos.

Se verificaron las superficies de render, el límite del buffer de geometría, la liberación de texturas y framebuffers, los gestos, la alineación, el modo cine, la pausa y la reconstrucción completa tras perder el contexto. Las rutas de audio y las páginas 1 a 6 conservan su implementación.

El respaldo RGBA8 también pasó las pruebas de WebGL 1: 16,69 ms de media y 17,30 ms de percentil 95 a 1280 × 720. Se compararon los píxeles de dos instantes para confirmar que plasma y luz cambian realmente con el tiempo. La vista móvil de 390 × 844 conserva el mensaje completo y no presenta desbordamiento horizontal.
