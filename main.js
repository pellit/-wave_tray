/*
 * WebGL Water
 * https://madebyevan.com/webgl-water/
 *
 * Copyright 2011 Evan Wallace
 * Released under the MIT license
 */

function text2html(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function handleError(text) {
  var html = text2html(text);
  if (html == 'WebGL not supported') {
    html = 'Your browser does not support WebGL.<br>Please see\
    <a href="https://get.webgl.org/get-a-webgl-implementation/">\
    Getting a WebGL Implementation</a>.';
  }
  var loading = document.getElementById('loading');
  loading.innerHTML = html;
  loading.style.zIndex = 1;
}

window.onerror = handleError;

var gl = GL.create();
var water;
var cubemap;
var renderer;
var angleX = -25;
var angleY = -200.5;
var cameraDistance = 4; // distancia inicial de la cámara

// Sphere physics info
var useSpherePhysics = false;
var center;
var oldCenter;
var velocity;
var gravity;
var radius;
var paused = false;

// Hand control variables
var handControl = null;
var isHandControlEnabled = false;
var isHandControlling = false; // Si la mano está controlando la pelota

window.onload = function () {
  // Zoom con la rueda del mouse (solo agregar una vez)
  document.addEventListener('wheel', function (e) {
    cameraDistance += e.deltaY * 0.01;
    cameraDistance = Math.max(2, Math.min(10, cameraDistance));
    draw();
  }, { passive: true });
  // --- NUEVO: variable global para paredes ---
  window.showWalls = true;
  window.dissipateWalls = false; // Por defecto: reflejar ondas como situación real

  var ratio = window.devicePixelRatio || 1;
  var help = document.getElementById('help');

  // --- NUEVO: Manejo de modos y controles ---
  var simMode = 'libre'; // modo de simulación
  var interactionMode = -1; // modo de interacción (drag, etc)
  var paramControls = document.getElementById('paramControls');
  var modeSelect = document.getElementById('modeSelect');
  var wallsCheckbox = document.getElementById('wallsCheckbox');
  var showWallsCheckbox = document.getElementById('showWallsCheckbox');
  // Manejar el checkbox de paredes
  wallsCheckbox.addEventListener('change', function () {
    window.dissipateWalls = wallsCheckbox.checked;
    recreateSimulation();
  });

  // Manejar el checkbox de mostrar paredes (océano sin límites)
  showWallsCheckbox.addEventListener('change', function () {
    window.showWalls = showWallsCheckbox.checked;
    draw(); // Redibujar inmediatamente
  });

  // Controles de parámetros físicos (solo velocidad y amortiguación)
  var waveSpeedSlider = document.getElementById('waveSpeedSlider');
  var waveSpeedValue = document.getElementById('waveSpeedValue');
  var dampingSlider = document.getElementById('dampingSlider');
  var dampingValue = document.getElementById('dampingValue');

  waveSpeedSlider.addEventListener('input', function () {
    physicsParams.waveSpeed = parseFloat(waveSpeedSlider.value);
    waveSpeedValue.textContent = physicsParams.waveSpeed.toFixed(1);
    if (water) water.setWaveSpeed(physicsParams.waveSpeed);
  });

  dampingSlider.addEventListener('input', function () {
    physicsParams.damping = parseFloat(dampingSlider.value);
    dampingValue.textContent = physicsParams.damping.toFixed(3);
    if (water) water.setDamping(physicsParams.damping);
  });

  function recreateSimulation() {
    var newScale = window.dissipateWalls ? 3.0 : 1.0;
    water = new Water(newScale, physicsParams);
    renderer = new Renderer(newScale);
    // Reinicializar con gotas
    for (var i = 0; i < 20; i++) {
      water.addDrop(Math.random() * 2 - 1, Math.random() * 2 - 1, 0.03, (i & 1) ? 0.01 : -0.01);
    }
    water.stepSimulation();
    water.updateNormals();
    renderer.updateCaustics(water);
    draw();
  }
  var modeParams = {
    oscilador1: { frecuencia: 1, amplitud: 0.2 },
    oscilador2: { frecuencia: 1, amplitud1: 0.2, amplitud2: 0.2, distancia: 0.5, borde: 0.2 },
    rectangulo: { frecuencia: 1, amplitud: 0.2, ancho: 1.2, numPuntos: 7 }
  };

  // Parámetros físicos de la simulación (solo velocidad y amortiguación configurables)
  var physicsParams = {
    waveSpeed: 2.0,        // Velocidad de ondas (configurable: 0.1 - 5.0)
    damping: 0.995,        // Amortiguación (configurable: 0.900 - 0.999)
    resolution: 256,       // Resolución fija
    boundaryType: 'reflect' // Tipo de frontera fijo
  };

  function renderParamControls() {
    let html = '';
    if (simMode === 'oscilador1') {
      html += '<label>Frecuencia: <input type="number" id="freq1" step="0.01" value="' + modeParams.oscilador1.frecuencia + '"></label><br>';
      html += '<label>Amplitud: <input type="number" id="amp1" step="0.01" min="0" max="2" value="' + modeParams.oscilador1.amplitud + '"></label>';
    } else if (simMode === 'oscilador2') {
      html += '<label>Frecuencia: <input type="number" id="freq2" step="0.01" value="' + modeParams.oscilador2.frecuencia + '"></label><br>';
      html += '<label>Amplitud esfera 1: <input type="number" id="amp21" step="0.01" min="0" max="2" value="' + modeParams.oscilador2.amplitud1 + '"></label><br>';
      html += '<label>Amplitud esfera 2: <input type="number" id="amp22" step="0.01" min="0" max="2" value="' + modeParams.oscilador2.amplitud2 + '"></label><br>';
      html += '<label>Distancia entre esferas: <input type="number" id="dist2" step="0.01" value="' + modeParams.oscilador2.distancia + '"></label><br>';
      html += '<label>Distancia al borde: <input type="number" id="borde2" step="0.01" value="' + modeParams.oscilador2.borde + '"></label>';
    } else if (simMode === 'rectangulo') {
      html += '<label>Frecuencia: <input type="number" id="freqr" step="0.01" value="' + modeParams.rectangulo.frecuencia + '"></label><br>';
      html += '<label>Amplitud: <input type="number" id="ampr" step="0.01" min="0" max="2" value="' + modeParams.rectangulo.amplitud + '"></label><br>';
      html += '<label>Ancho: <input type="number" id="anchor" step="0.1" value="' + modeParams.rectangulo.ancho + '"></label><br>';
      html += '<label>Número de puntos: <input type="number" id="numpr" step="1" min="3" max="15" value="' + modeParams.rectangulo.numPuntos + '"></label>';
    }
    paramControls.innerHTML = html;
  }

  modeSelect.addEventListener('change', function () {
    simMode = modeSelect.value;
    renderParamControls();

    // Mostrar/ocultar controles de manos según el modo
    var handControlSection = document.getElementById('handControlSection');
    if (simMode === 'libre') {
      handControlSection.style.display = 'block';
    } else {
      handControlSection.style.display = 'none';
      // Deshabilitar control de manos si no está en modo libre
      if (handControl && isHandControlEnabled) {
        handControl.disable();
        isHandControlEnabled = false;
        isHandControlling = false;
        updateHandControlUI();
      }
    }

    if (simMode === 'libre') {
      center = oldCenter = new GL.Vector(-0.4, -0.75, 0.2);
      velocity = new GL.Vector();
      radius = 0.25;
    }
  });

  paramControls.addEventListener('input', function (e) {
    if (simMode === 'oscilador1') {
      modeParams.oscilador1.frecuencia = parseFloat(document.getElementById('freq1').value);
      modeParams.oscilador1.amplitud = parseFloat(document.getElementById('amp1').value);
    } else if (simMode === 'oscilador2') {
      modeParams.oscilador2.frecuencia = parseFloat(document.getElementById('freq2').value);
      modeParams.oscilador2.amplitud1 = parseFloat(document.getElementById('amp21').value);
      modeParams.oscilador2.amplitud2 = parseFloat(document.getElementById('amp22').value);
      modeParams.oscilador2.distancia = parseFloat(document.getElementById('dist2').value);
      modeParams.oscilador2.borde = parseFloat(document.getElementById('borde2').value);
    } else if (simMode === 'rectangulo') {
      modeParams.rectangulo.frecuencia = parseFloat(document.getElementById('freqr').value);
      modeParams.rectangulo.amplitud = parseFloat(document.getElementById('ampr').value);
      modeParams.rectangulo.ancho = parseFloat(document.getElementById('anchor').value);
      modeParams.rectangulo.numPuntos = parseInt(document.getElementById('numpr').value);
    }
  });

  renderParamControls();

  // === FUNCIONES DE CONTROL DE MANOS ===

  function initializeHandControl() {
    if (!handControl) {
      handControl = new HandControl();

      // Configurar callbacks
      handControl.onHandGraspChange = function (isGrasping, handPos) {
        if (simMode === 'libre') {
          isHandControlling = isGrasping;
          updateHandControlUI();

          if (isGrasping) {
            // Convertir posición de mano a coordenadas del simulador
            var simCoords = handControl.handToSimulatorCoords(handPos);
            // Usar amplitud como en los osciladores: y0 + amplitud
            center.x = simCoords.x;
            center.y = 0.0 + simCoords.amplitude; // Similar a osciladores
            center.z = simCoords.z;

            // Parar física de la esfera mientras se controla
            velocity = new GL.Vector();

            console.log('Mano agarró la pelota - Amplitud:', simCoords.amplitude, 'Intensidad:', simCoords.intensity);
          } else {
            console.log('Mano soltó la pelota');
          }
        }
      };

      handControl.onHandPositionChange = function (handPos, isGrasping) {
        if (simMode === 'libre' && isGrasping && isHandControlling) {
          // Actualizar posición como un oscilador manual
          var simCoords = handControl.handToSimulatorCoords(handPos);
          center.x = simCoords.x;
          center.y = 0.0 + simCoords.amplitude; // Nivel de agua + amplitud (como osciladores)
          center.z = simCoords.z;

          // Mantener velocidad en cero mientras se controla
          velocity = new GL.Vector();
        }
      };
    }

    return handControl.initialize();
  }

  function updateHandControlUI() {
    var btnInit = document.getElementById('btnInitHands');
    var btnToggle = document.getElementById('btnToggleHands');
    var btnDebug = document.getElementById('btnDebugHands');
    var status = document.getElementById('handStatus');

    if (!handControl || !handControl.isInitialized) {
      btnInit.style.display = 'inline-block';
      btnToggle.style.display = 'none';
      btnDebug.style.display = 'none';
      status.textContent = 'Presiona "Inicializar Cámara" para comenzar';
    } else if (!isHandControlEnabled) {
      btnInit.style.display = 'none';
      btnToggle.style.display = 'inline-block';
      btnToggle.textContent = 'Activar Control';
      btnToggle.style.background = '#2196F3';
      btnDebug.style.display = 'inline-block';
      status.textContent = 'Cámara lista. Presiona "Activar Control"';
    } else {
      btnInit.style.display = 'none';
      btnToggle.style.display = 'inline-block';
      btnToggle.textContent = 'Desactivar Control';
      btnToggle.style.background = '#f44336';
      btnDebug.style.display = 'inline-block';

      if (isHandControlling) {
        status.textContent = '🔴 Controlando pelota con la mano';
        status.style.color = '#ff6666';
      } else {
        status.textContent = '🟢 Control activo - Cierra la mano para agarrar';
        status.style.color = '#66ff66';
      }
    }
  }

  // Event listeners para botones de control de manos
  document.getElementById('btnInitHands').addEventListener('click', async function () {
    this.textContent = 'Inicializando...';
    this.disabled = true;

    try {
      var success = await initializeHandControl();
      if (success) {
        updateHandControlUI();
      } else {
        alert('Error al inicializar la cámara. Verifique los permisos.');
        this.textContent = 'Inicializar Cámara';
        this.disabled = false;
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al inicializar: ' + error.message);
      this.textContent = 'Inicializar Cámara';
      this.disabled = false;
    }
  });

  document.getElementById('btnToggleHands').addEventListener('click', function () {
    if (isHandControlEnabled) {
      handControl.disable();
      isHandControlEnabled = false;
      isHandControlling = false;
    } else {
      handControl.enable();
      isHandControlEnabled = true;
    }
    updateHandControlUI();
  });

  document.getElementById('btnDebugHands').addEventListener('click', function () {
    if (handControl) {
      handControl.toggleDebugCanvas();
    }
  });

  // Inicializar UI de control de manos
  updateHandControlUI();

  function onresize() {
    var width = innerWidth - help.clientWidth - 20;
    var height = innerHeight;
    gl.canvas.width = width * ratio;
    gl.canvas.height = height * ratio;
    gl.canvas.style.width = width + 'px';
    gl.canvas.style.height = height + 'px';
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.matrixMode(gl.PROJECTION);
    gl.loadIdentity();
    gl.perspective(45, gl.canvas.width / gl.canvas.height, 0.01, 100);
    gl.matrixMode(gl.MODELVIEW);
    draw();
  }

  document.body.appendChild(gl.canvas);
  gl.clearColor(0, 0, 0, 1);

  // --- NUEVO: espacio controlable por checkbox ---
  var initialScale = window.dissipateWalls ? 3.0 : 1.0;
  water = new Water(initialScale, physicsParams);
  renderer = new Renderer(initialScale);
  cubemap = new Cubemap({
    xneg: document.getElementById('xneg'),
    xpos: document.getElementById('xpos'),
    yneg: document.getElementById('ypos'),
    ypos: document.getElementById('ypos'),
    zneg: document.getElementById('zneg'),
    zpos: document.getElementById('zpos')
  });

  if (!water.textureA.canDrawTo() || !water.textureB.canDrawTo()) {
    throw new Error('Rendering to floating-point textures is required but not supported');
  }

  center = oldCenter = new GL.Vector(-0.4, -0.75, 0.2);
  velocity = new GL.Vector();
  gravity = new GL.Vector(0, -4, 0);
  radius = 0.125;

  for (var i = 0; i < 20; i++) {
    water.addDrop(Math.random() * 2 - 1, Math.random() * 2 - 1, 0.03, (i & 1) ? 0.01 : -0.01);
  }

  // Inicializar la simulación
  water.stepSimulation();
  water.updateNormals();
  renderer.updateCaustics(water);

  document.getElementById('loading').innerHTML = '';
  onresize();
  draw(); // Dibujar inmediatamente

  var requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    function (callback) { setTimeout(callback, 0); };

  var prevTime = new Date().getTime();
  function animate() {
    var nextTime = new Date().getTime();
    if (!paused) {
      update((nextTime - prevTime) / 1000);
      draw();
    }
    prevTime = nextTime;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  window.onresize = onresize;

  var prevHit;
  var planeNormal;
  var mode = -1;
  var MODE_ADD_DROPS = 0;
  var MODE_MOVE_SPHERE = 1;
  var MODE_ORBIT_CAMERA = 2;

  var oldX, oldY;

  function startDrag(x, y) {
    // Si el control de manos está activo y controlando, no permitir arrastre manual
    if (isHandControlling) {
      return;
    }

    oldX = x;
    oldY = y;
    var tracer = new GL.Raytracer();
    var ray = tracer.getRayForPixel(x * ratio, y * ratio);
    var pointOnPlane = tracer.eye.add(ray.multiply(-tracer.eye.y / ray.y));
    var sphereHitTest = GL.Raytracer.hitTestSphere(tracer.eye, ray, center, radius);
    if (simMode === 'libre' && sphereHitTest) {
      interactionMode = MODE_MOVE_SPHERE;
      prevHit = sphereHitTest.hit;
      planeNormal = tracer.getRayForPixel(gl.canvas.width / 2, gl.canvas.height / 2).negative();
    } else if (Math.abs(pointOnPlane.x) < 1 && Math.abs(pointOnPlane.z) < 1) {
      interactionMode = MODE_ADD_DROPS;
      duringDrag(x, y);
    } else if (!window.showWalls) {
      // Si no hay paredes, permitir agregar gotas en cualquier lugar
      interactionMode = MODE_ADD_DROPS;
      duringDrag(x, y);
    } else {
      interactionMode = MODE_ORBIT_CAMERA;
    }
  }

  function duringDrag(x, y) {
    switch (interactionMode) {
      case MODE_ADD_DROPS: {
        var tracer = new GL.Raytracer();
        var ray = tracer.getRayForPixel(x * ratio, y * ratio);
        var pointOnPlane = tracer.eye.add(ray.multiply(-tracer.eye.y / ray.y));
        water.addDrop(pointOnPlane.x, pointOnPlane.z, 0.03, 0.01);
        if (paused) {
          water.updateNormals();
          renderer.updateCaustics(water);
        }
        break;
      }
      case MODE_MOVE_SPHERE: {
        if (simMode === 'libre') {
          var tracer = new GL.Raytracer();
          var ray = tracer.getRayForPixel(x * ratio, y * ratio);
          var t = -planeNormal.dot(tracer.eye.subtract(prevHit)) / planeNormal.dot(ray);
          var nextHit = tracer.eye.add(ray.multiply(t));
          center = center.add(nextHit.subtract(prevHit));
          // Permitir movimiento libre en X y Z si no hay paredes
          center.y = Math.max(radius - 1, Math.min(10, center.y));
          if (window.showWalls) {
            center.x = Math.max(radius - 1, Math.min(1 - radius, center.x));
            center.z = Math.max(radius - 1, Math.min(1 - radius, center.z));
          }
          prevHit = nextHit;
          if (paused) renderer.updateCaustics(water);
        }
        break;
      }
      case MODE_ORBIT_CAMERA: {
        angleY -= x - oldX;
        angleX -= y - oldY;
        angleX = Math.max(-89.999, Math.min(89.999, angleX));
        break;
      }
    }
    oldX = x;
    oldY = y;
    if (paused) draw();
  }

  function stopDrag() {
    interactionMode = -1;
  }

  function isHelpElement(element) {
    return element === help || element.parentNode && isHelpElement(element.parentNode);
  }

  document.onmousedown = function (e) {
    if (!isHelpElement(e.target)) {
      e.preventDefault();
      startDrag(e.pageX, e.pageY);
    }
  };

  document.onmousemove = function (e) {
    duringDrag(e.pageX, e.pageY);
  };

  document.onmouseup = function () {
    stopDrag();
  };

  document.ontouchstart = function (e) {
    if (e.touches.length === 1 && !isHelpElement(e.target)) {
      e.preventDefault();
      startDrag(e.touches[0].pageX, e.touches[0].pageY);
    }
  };

  document.ontouchmove = function (e) {
    if (e.touches.length === 1) {
      duringDrag(e.touches[0].pageX, e.touches[0].pageY);
    }
  };

  document.ontouchend = function (e) {
    if (e.touches.length == 0) {
      stopDrag();
    }
  };

  document.onkeydown = function (e) {
    if (e.which == ' '.charCodeAt(0)) paused = !paused;
    else if (e.which == 'G'.charCodeAt(0)) useSpherePhysics = !useSpherePhysics;
    else if (e.which == 'L'.charCodeAt(0) && paused) draw();
  };

  var frame = 0;

  function update(seconds) {
    if (seconds > 1) return;
    frame += seconds * 2;

    // --- NUEVO: lógica de modos ---
    if (simMode === 'libre') {
      // Si el control de manos está activo, no aplicar física normal
      if (isHandControlling) {
        // La posición ya se actualiza en los callbacks del control de manos
        velocity = new GL.Vector(); // Mantener velocidad en cero
      } else if (interactionMode == MODE_MOVE_SPHERE) {
        velocity = new GL.Vector();
      } else if (useSpherePhysics) {
        var percentUnderWater = Math.max(0, Math.min(1, (radius - center.y) / (2 * radius)));
        velocity = velocity.add(gravity.multiply(seconds - 1.1 * seconds * percentUnderWater));
        velocity = velocity.subtract(velocity.unit().multiply(percentUnderWater * seconds * velocity.dot(velocity)));
        center = center.add(velocity.multiply(seconds));
        if (center.y < radius - 1) {
          center.y = radius - 1;
          velocity.y = Math.abs(velocity.y) * 0.7;
        }
      }
      water.moveSphere(oldCenter, center, radius);
      oldCenter = center;
    } else if (simMode === 'oscilador1') {
      // Oscilador de una esfera: media sumergida, oscila verticalmente
      var t = frame;
      var freq = modeParams.oscilador1.frecuencia;
      var amp = modeParams.oscilador1.amplitud;
      var y0 = 0.0; // nivel de agua
      var y = y0 + amp * Math.sin(2 * Math.PI * freq * t);
      var c = new GL.Vector(0, y, 0); // centro en el medio
      // Permitir que la esfera salga del agua con amplitudes grandes
      // Sin limitaciones en Y para permitir movimiento completo
      water.moveSphere(oldCenter || c, c, radius);
      oldCenter = c;
      center = c;
    } else if (simMode === 'oscilador2') {
      // Dos esferas: cada una puede tener amplitud independiente
      var t = frame;
      var freq = modeParams.oscilador2.frecuencia;
      var amp1 = modeParams.oscilador2.amplitud1;
      var amp2 = modeParams.oscilador2.amplitud2;
      var dist = modeParams.oscilador2.distancia;
      var borde = modeParams.oscilador2.borde;
      var y0 = 0.0;
      var y1 = y0 + amp1 * Math.sin(2 * Math.PI * freq * t);
      var y2 = y0 + amp2 * Math.sin(2 * Math.PI * freq * t);
      var c1 = new GL.Vector(-dist / 2, y1, 0);
      var c2 = new GL.Vector(dist / 2, y2, 0);
      // Limitar para que no salgan del borde horizontal solo si hay paredes visibles
      if (window.showWalls) {
        c1.x = Math.max(-1 + borde + radius, Math.min(1 - borde - radius, c1.x));
        c2.x = Math.max(-1 + borde + radius, Math.min(1 - borde - radius, c2.x));
      }
      // Permitir que las esferas salgan del agua con amplitudes grandes
      // Sin limitaciones en Y para permitir movimiento completo vertical
      // Mover ambas esferas en el agua
      water.moveSphere(oldCenter && oldCenter.c1 ? oldCenter.c1 : c1, c1, radius);
      water.moveSphere(oldCenter && oldCenter.c2 ? oldCenter.c2 : c2, c2, radius);
      oldCenter = { c1: c1, c2: c2 };
      // Para el renderizado, mostrar solo la primera esfera
      center = c1;
    } else if (simMode === 'rectangulo') {
      // Rectángulo oscilante: simular múltiples puntos para crear onda plana
      var t = frame;
      var freq = modeParams.rectangulo.frecuencia;
      var amp = modeParams.rectangulo.amplitud;
      var rectWidth = modeParams.rectangulo.ancho;
      var numPoints = modeParams.rectangulo.numPuntos;
      var y0 = 0.0;
      var y = y0 + amp * Math.sin(2 * Math.PI * freq * t);

      // Crear una línea de puntos oscilantes para simular onda plana
      var pointRadius = 0.06; // radio pequeño para cada punto

      if (!oldCenter || !oldCenter.points || oldCenter.points.length !== numPoints) {
        oldCenter = { points: [] };
        for (var i = 0; i < numPoints; i++) {
          // Separación nula: puntos uno al lado del otro
          var x = (i - (numPoints - 1) / 2) * (pointRadius * 2);
          oldCenter.points[i] = new GL.Vector(x, y, 0);
        }
      }

      // Actualizar y mover cada punto
      for (var i = 0; i < numPoints; i++) {
        // Separación nula: puntos uno al lado del otro
        var x = (i - (numPoints - 1) / 2) * (pointRadius * 2);
        var newPoint = new GL.Vector(x, y, 0);
        // Permitir que los puntos salgan del agua con amplitudes grandes
        // Sin limitaciones en Y para permitir movimiento completo vertical
        water.moveSphere(oldCenter.points[i], newPoint, pointRadius);
        oldCenter.points[i] = newPoint;
      }

      // Para renderizado, usar el punto central
      center = oldCenter.points[Math.floor(numPoints / 2)];
    }

    // Actualización de la simulación de agua y gráficos
    water.stepSimulation();
    water.stepSimulation();
    water.updateNormals();
    renderer.updateCaustics(water);
  }

  function draw() {
    // Cambiar la dirección de la luz si se presiona L
    if (GL.keys.L) {
      renderer.lightDir = GL.Vector.fromAngles((90 - angleY) * Math.PI / 180, -angleX * Math.PI / 180);
      if (paused) renderer.updateCaustics(water);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.loadIdentity();
    gl.translate(0, 0, -cameraDistance * (window.dissipateWalls ? 1.5 : 1.0));
    gl.rotate(-angleX, 1, 0, 0);
    gl.rotate(-angleY, 0, 1, 0);
    gl.translate(0, 0.5, 0);

    gl.enable(gl.DEPTH_TEST);
    // Solo renderizar paredes si está habilitado (simular océano sin límites)
    if (window.showWalls) {
      renderer.renderCube();
    }
    renderer.renderWater(water, cubemap);

    // Renderizado según el modo
    if (simMode === 'libre' || simMode === 'oscilador1') {
      renderer.sphereCenter = center;
      renderer.sphereRadius = radius;
      renderer.renderSphere();
    } else if (simMode === 'oscilador2' && oldCenter && oldCenter.c1 && oldCenter.c2) {
      // Renderizar ambas esferas
      renderer.sphereCenter = oldCenter.c1;
      renderer.sphereRadius = radius;
      renderer.renderSphere();
      renderer.sphereCenter = oldCenter.c2;
      renderer.sphereRadius = radius;
      renderer.renderSphere();
    } else if (simMode === 'rectangulo' && oldCenter && oldCenter.points) {
      // Renderizar múltiples esferas para simular rectángulo
      var pointRadius = 0.06;
      for (var i = 0; i < oldCenter.points.length; i++) {
        renderer.sphereCenter = oldCenter.points[i];
        renderer.sphereRadius = pointRadius;
        renderer.renderSphere();
      }
    }
    gl.disable(gl.DEPTH_TEST);
  }
};
