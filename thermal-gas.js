/*
 * Simulador de Gas Térmico - Adaptación del modelo de agua
 * Basado en el simulador WebGL Water para estudios de temperatura
 */

function ThermalGas(scale, options) {
    this.scale = scale || 1.0;

    // Parámetros térmicos (análogos a los del agua)
    this.options = options || {};
    this.thermalDiffusivity = this.options.diffusivity || 0.1;    // Análogo a waveSpeed
    this.heatRetention = this.options.retention || 0.995;        // Análogo a damping
    this.resolution = this.options.resolution || 256;

    // Parámetros físicos del gas
    this.ambientTemp = 20.0;    // Temperatura ambiente (°C)
    this.maxTemp = 100.0;       // Temperatura máxima
    this.minTemp = 0.0;         // Temperatura mínima
    this.gravity = 0.1;         // Factor de convección

    var vertexShader = '\
    varying vec2 coord;\
    void main() {\
      coord = gl_Vertex.xy * 0.5 + 0.5;\
      gl_Position = vec4(gl_Vertex.xyz, 1.0);\
    }\
  ';

    this.plane = GL.Mesh.plane({ size: 2 * this.scale });

    var filter = GL.Texture.canUseFloatingPointLinearFiltering() ? gl.LINEAR : gl.NEAREST;
    this.textureA = new GL.Texture(this.resolution, this.resolution, { type: gl.FLOAT, filter: filter });
    this.textureB = new GL.Texture(this.resolution, this.resolution, { type: gl.FLOAT, filter: filter });

    // Shader para fuentes de calor (análogo a dropShader)
    this.heatSourceShader = new GL.Shader(vertexShader, '\
uniform sampler2D texture;\
uniform vec2 center;\
uniform float radius;\
uniform float temperature;\
uniform float intensity;\
varying vec2 coord;\
void main() {\
  vec4 info = texture2D(texture, coord);\
  float dist = length(center * 0.5 + 0.5 - coord);\
  float heatFactor = max(0.0, 1.0 - dist / radius);\
  \
  /* Aplicar calor con perfil suave */\
  float tempIncrease = heatFactor * intensity * (temperature - info.r);\
  info.r += tempIncrease;\
  \
  gl_FragColor = info;\
}\
');

    // Shader de difusión térmica (análogo a updateShader)
    this.thermalUpdateShader = new GL.Shader(vertexShader, '\
uniform sampler2D texture;\
uniform vec2 delta;\
uniform float diffusivity;\
uniform float retention;\
uniform float gravity;\
uniform float dt;\
varying vec2 coord;\
\
void main() {\
  vec4 info = texture2D(texture, coord);\
  vec2 dx = vec2(delta.x, 0.0);\
  vec2 dy = vec2(0.0, delta.y);\
  \
  /* Temperaturas vecinas */\
  float T_center = info.r;\
  float T_left   = texture2D(texture, coord - dx).r;\
  float T_right  = texture2D(texture, coord + dx).r;\
  float T_up     = texture2D(texture, coord + dy).r;\
  float T_down   = texture2D(texture, coord - dy).r;\
  \
  /* Ecuación de difusión térmica: ∂T/∂t = α∇²T */\
  float laplacian = T_left + T_right + T_up + T_down - 4.0 * T_center;\
  \
  /* Velocidad de cambio de temperatura */\
  info.g += laplacian * diffusivity;\
  \
  /* Convección: gas caliente sube */\
  float buoyancy = (T_center - 20.0) / 80.0; /* Normalizado */\
  info.b += buoyancy * gravity; /* Componente Y de velocidad */\
  \
  /* Aplicar retención térmica (pérdida de calor) */\
  info.g *= retention;\
  info.b *= 0.98; /* Amortiguamiento de convección */\
  \
  /* Actualizar temperatura */\
  info.r += info.g * dt;\
  \
  /* Transporte por convección */\
  vec2 convectionOffset = vec2(0.0, info.b * dt * delta.y);\
  vec4 convectedTemp = texture2D(texture, coord - convectionOffset);\
  info.r = mix(info.r, convectedTemp.r, abs(info.b) * 0.1);\
  \
  /* Limitar temperatura */\
  info.r = clamp(info.r, 0.0, 120.0);\
  \
  gl_FragColor = info;\
}\
');

    // Shader para cálculo de gradientes térmicos (análogo a normalShader)
    this.gradientShader = new GL.Shader(vertexShader, '\
uniform sampler2D texture;\
uniform vec2 delta;\
varying vec2 coord;\
\
void main() {\
  vec4 info = texture2D(texture, coord);\
  \
  /* Calcular gradiente de temperatura */\
  float T_right = texture2D(texture, vec2(coord.x + delta.x, coord.y)).r;\
  float T_up    = texture2D(texture, vec2(coord.x, coord.y + delta.y)).r;\
  \
  vec2 gradient = vec2(T_right - info.r, T_up - info.r);\
  \
  /* Normalizar gradiente para visualización */\
  gradient = normalize(gradient) * length(gradient) / 10.0;\
  \
  gl_FragColor = vec4(info.r, gradient.x, gradient.y, 1.0);\
}\
');

    // Inicializar con temperatura ambiente
    this.textureA.drawTo(function () {
        gl.clearColor(20.0 / 100.0, 0, 0, 1); // 20°C normalizado
        gl.clear(gl.COLOR_BUFFER_BIT);
    });
    this.textureB.drawTo(function () {
        gl.clearColor(20.0 / 100.0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    });
}

// Métodos principales (análogos a los del agua)
ThermalGas.prototype = {
    // Añadir fuente de calor (análogo a addDrop)
    addHeatSource: function (x, y, radius, temperature, intensity) {
        this.textureB.drawTo(() => {
            this.heatSourceShader.uniforms({
                texture: this.textureA,
                center: [x, y],
                radius: radius,
                temperature: temperature / 100.0, // Normalizar
                intensity: intensity || 0.1
            }).draw(this.plane);
        });
        this.swapTextures();
    },

    // Añadir sumidero de frío
    addColdSource: function (x, y, radius, temperature, intensity) {
        this.addHeatSource(x, y, radius, temperature, -(intensity || 0.1));
    },

    // Actualizar simulación térmica (análogo a stepSimulation)
    stepThermalSimulation: function () {
        this.textureB.drawTo(() => {
            this.thermalUpdateShader.uniforms({
                texture: this.textureA,
                delta: [1 / this.resolution, 1 / this.resolution],
                diffusivity: this.thermalDiffusivity,
                retention: this.heatRetention,
                gravity: this.gravity,
                dt: 0.016 // ~60 FPS
            }).draw(this.plane);
        });
        this.swapTextures();
    },

    // Calcular gradientes térmicos (análogo a updateNormals)
    updateThermalGradients: function () {
        this.textureB.drawTo(() => {
            this.gradientShader.uniforms({
                texture: this.textureA,
                delta: [1 / this.resolution, 1 / this.resolution]
            }).draw(this.plane);
        });
        this.swapTextures();
    },

    swapTextures: function () {
        var temp = this.textureA;
        this.textureA = this.textureB;
        this.textureB = temp;
    },

    // Configurar parámetros durante ejecución
    setDiffusivity: function (value) {
        this.thermalDiffusivity = Math.max(0.01, Math.min(2.0, value));
    },

    setRetention: function (value) {
        this.heatRetention = Math.max(0.9, Math.min(0.999, value));
    },

    setGravity: function (value) {
        this.gravity = Math.max(0.0, Math.min(1.0, value));
    },

    // Métodos de análisis
    getAverageTemperature: function () {
        // Implementar lectura de textura para calcular promedio
    },

    // Experimentos predefinidos
    startConductionExperiment: function () {
        // Configurar paredes caliente y fría
        this.setWallTemperature('left', 80);
        this.setWallTemperature('right', 20);
    },

    startConvectionExperiment: function () {
        // Fuente de calor en la base
        this.addHeatSource(0, -0.8, 0.3, 80, 0.2);
    },

    startDiffusionExperiment: function () {
        // Fuente puntual en el centro
        this.addHeatSource(0, 0, 0.1, 100, 0.5);
    }
};

/*
COMPARACIÓN DE MODELOS:

AGUA (Ondas mecánicas):
- height = desplazamiento vertical
- velocity = velocidad de desplazamiento  
- Ecuación: ∂²h/∂t² = c²∇²h
- Conserva energía mecánica

GAS TÉRMICO (Difusión + Convección):
- temperature = temperatura local
- thermal_velocity = tasa de cambio de temperatura
- Ecuación: ∂T/∂t = α∇²T + convección
- Conserva energía térmica

VENTAJAS DEL MODELO TÉRMICO:
1. Educativo: visualiza conceptos de termodinámica
2. Fenómenos ricos: difusión, convección, gradientes
3. Experimentos controlados: leyes de Fourier, Rayleigh-Bénard
4. Mediciones cuantitativas: flujos de calor, distribuciones

APLICACIONES EDUCATIVAS:
- Ley de Fourier de conducción
- Convección natural y forzada  
- Difusión térmica
- Equilibrio térmico
- Transferencia de calor
- Análisis de eficiencia energética
*/
