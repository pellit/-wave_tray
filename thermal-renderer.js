/**
 * THERMAL RENDERER - Visualización de Simulación de Gas Térmico
 * Adaptado del renderer de agua para mostrar mapas de calor y fenómenos térmicos
 * 
 * DIFERENCIAS CLAVE vs. Water Renderer:
 * - En lugar de superficie 3D → mapa de calor 2D
 * - En lugar de reflexiones → visualización de gradientes térmicos
 * - En lugar de ondas → isotermas y vectores de flujo
 */

class ThermalRenderer {
    constructor(canvas, thermalGas) {
        this.canvas = canvas;
        this.thermalGas = thermalGas;
        this.gl = canvas.getContext('webgl2');

        if (!this.gl) {
            throw new Error('WebGL2 no soportado');
        }

        this.visualizationMode = 'heatmap'; // 'heatmap', 'isotherms', 'flow', 'combined'
        this.temperatureRange = { min: 0, max: 100 }; // Rango de temperatura para coloreo
        this.showConvectionVectors = false;
        this.showMeasurements = true;

        this.initShaders();
        this.initGeometry();
        this.initColorMaps();
        this.setupMeasurements();
    }

    /**
     * SHADERS PARA VISUALIZACIÓN TÉRMICA
     */
    initShaders() {
        // Vertex shader para quad completo
        const vertexShaderSource = `#version 300 es
            in vec2 a_position;
            out vec2 v_texCoord;
            
            void main() {
                v_texCoord = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // Fragment shader para mapa de calor
        const heatmapFragmentSource = `#version 300 es
            precision highp float;
            
            uniform sampler2D u_temperatureTexture;
            uniform vec2 u_temperatureRange; // min, max
            uniform float u_time;
            uniform bool u_showIsotherms;
            
            in vec2 v_texCoord;
            out vec4 fragColor;
            
            // Mapa de color térmico: azul → verde → amarillo → rojo
            vec3 temperatureToColor(float temp) {
                temp = clamp(temp, 0.0, 1.0);
                
                if (temp < 0.25) {
                    // Azul a cyan
                    float t = temp * 4.0;
                    return mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), t);
                } else if (temp < 0.5) {
                    // Cyan a verde
                    float t = (temp - 0.25) * 4.0;
                    return mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 1.0, 0.0), t);
                } else if (temp < 0.75) {
                    // Verde a amarillo
                    float t = (temp - 0.5) * 4.0;
                    return mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), t);
                } else {
                    // Amarillo a rojo
                    float t = (temp - 0.75) * 4.0;
                    return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), t);
                }
            }
            
            // Calcular gradiente de temperatura para isotermas
            vec2 getTemperatureGradient(vec2 coord) {
                float epsilon = 1.0 / 512.0; // Tamaño de texel
                
                float tempRight = texture(u_temperatureTexture, coord + vec2(epsilon, 0.0)).r;
                float tempLeft = texture(u_temperatureTexture, coord - vec2(epsilon, 0.0)).r;
                float tempUp = texture(u_temperatureTexture, coord + vec2(0.0, epsilon)).r;
                float tempDown = texture(u_temperatureTexture, coord - vec2(0.0, epsilon)).r;
                
                float dx = (tempRight - tempLeft) / (2.0 * epsilon);
                float dy = (tempUp - tempDown) / (2.0 * epsilon);
                
                return vec2(dx, dy);
            }
            
            void main() {
                float temperature = texture(u_temperatureTexture, v_texCoord).r;
                
                // Normalizar temperatura al rango [0,1]
                float normalizedTemp = (temperature - u_temperatureRange.x) / 
                                     (u_temperatureRange.y - u_temperatureRange.x);
                
                vec3 color = temperatureToColor(normalizedTemp);
                
                // Añadir isotermas si está activado
                if (u_showIsotherms) {
                    vec2 gradient = getTemperatureGradient(v_texCoord);
                    float gradientMagnitude = length(gradient);
                    
                    // Crear líneas de isotermas
                    float isotherms = sin(normalizedTemp * 20.0 * 3.14159) * 0.5 + 0.5;
                    isotherms = smoothstep(0.8, 1.0, isotherms);
                    
                    // Hacer las líneas más visibles en zonas de alto gradiente
                    isotherms *= smoothstep(0.0, 0.1, gradientMagnitude);
                    
                    color = mix(color, vec3(0.0, 0.0, 0.0), isotherms * 0.3);
                }
                
                fragColor = vec4(color, 1.0);
            }
        `;

        // Fragment shader para vectores de flujo térmico
        const flowVectorFragmentSource = `#version 300 es
            precision highp float;
            
            uniform sampler2D u_temperatureTexture;
            uniform vec2 u_temperatureRange;
            uniform float u_vectorScale;
            uniform vec2 u_resolution;
            
            in vec2 v_texCoord;
            out vec4 fragColor;
            
            vec2 getHeatFlowVector(vec2 coord) {
                float epsilon = 1.0 / 512.0;
                
                float tempRight = texture(u_temperatureTexture, coord + vec2(epsilon, 0.0)).r;
                float tempLeft = texture(u_temperatureTexture, coord - vec2(epsilon, 0.0)).r;
                float tempUp = texture(u_temperatureTexture, coord + vec2(0.0, epsilon)).r;
                float tempDown = texture(u_temperatureTexture, coord - vec2(0.0, epsilon)).r;
                
                // Flujo de calor: q = -k∇T (Ley de Fourier)
                float dx = -(tempRight - tempLeft) / (2.0 * epsilon);
                float dy = -(tempUp - tempDown) / (2.0 * epsilon);
                
                return vec2(dx, dy);
            }
            
            // Dibujar flecha de vector
            float drawArrow(vec2 coord, vec2 center, vec2 direction, float scale) {
                vec2 toPoint = coord - center;
                float dirLength = length(direction);
                
                if (dirLength < 0.001) return 0.0;
                
                vec2 dirNorm = direction / dirLength;
                vec2 perpDir = vec2(-dirNorm.y, dirNorm.x);
                
                // Proyectar punto en dirección del vector
                float alongArrow = dot(toPoint, dirNorm);
                float perpToArrow = dot(toPoint, perpDir);
                
                // Línea principal del vector
                float mainLine = 1.0 - smoothstep(0.0, scale * 0.02, abs(perpToArrow));
                mainLine *= step(0.0, alongArrow) * step(alongArrow, dirLength * scale);
                
                // Punta de flecha
                float arrowHead = 0.0;
                if (alongArrow > dirLength * scale * 0.7) {
                    float headWidth = (dirLength * scale - alongArrow) * 2.0;
                    arrowHead = 1.0 - smoothstep(0.0, headWidth, abs(perpToArrow));
                }
                
                return max(mainLine, arrowHead);
            }
            
            void main() {
                vec2 flowVector = getHeatFlowVector(v_texCoord);
                
                // Color base del mapa de calor
                float temperature = texture(u_temperatureTexture, v_texCoord).r;
                float normalizedTemp = (temperature - u_temperatureRange.x) / 
                                     (u_temperatureRange.y - u_temperatureRange.x);
                
                // Colores suaves para fondo
                vec3 bgColor = mix(vec3(0.1, 0.1, 0.3), vec3(0.3, 0.1, 0.1), normalizedTemp);
                
                // Dibujar vectores de flujo en grid
                vec2 gridCoord = v_texCoord * 16.0; // 16x16 grid de vectores
                vec2 gridCenter = (floor(gridCoord) + 0.5) / 16.0;
                
                vec2 centerFlowVector = getHeatFlowVector(gridCenter);
                float vectorMagnitude = length(centerFlowVector);
                
                // Solo dibujar vectores donde hay flujo significativo
                if (vectorMagnitude > 0.1) {
                    float arrow = drawArrow(v_texCoord, gridCenter, centerFlowVector, u_vectorScale);
                    
                    // Color del vector basado en magnitud
                    vec3 vectorColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.8, 0.0), 
                                         min(vectorMagnitude * 10.0, 1.0));
                    
                    bgColor = mix(bgColor, vectorColor, arrow * 0.8);
                }
                
                fragColor = vec4(bgColor, 1.0);
            }
        `;

        this.heatmapShader = this.createShaderProgram(vertexShaderSource, heatmapFragmentSource);
        this.flowVectorShader = this.createShaderProgram(vertexShaderSource, flowVectorFragmentSource);
    }

    /**
     * GEOMETRÍA Y BUFFERS
     */
    initGeometry() {
        // Quad que cubre toda la pantalla
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        // VAO para rendering
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);

        const positionLocation = this.gl.getAttribLocation(this.heatmapShader, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    /**
     * MAPAS DE COLOR Y PALETAS
     */
    initColorMaps() {
        // Paletas de color predefinidas
        this.colorPalettes = {
            thermal: { // Azul → Rojo (clásico térmico)
                cold: [0.0, 0.0, 1.0],
                cool: [0.0, 1.0, 1.0],
                warm: [1.0, 1.0, 0.0],
                hot: [1.0, 0.0, 0.0]
            },
            plasma: { // Paleta científica
                cold: [0.05, 0.03, 0.53],
                cool: [0.5, 0.0, 0.8],
                warm: [0.9, 0.2, 0.4],
                hot: [0.99, 0.91, 0.11]
            },
            blackbody: { // Radiación de cuerpo negro
                cold: [0.0, 0.0, 0.0],
                cool: [1.0, 0.0, 0.0],
                warm: [1.0, 0.5, 0.0],
                hot: [1.0, 1.0, 1.0]
            }
        };

        this.currentPalette = 'thermal';
    }

    /**
     * SISTEMA DE MEDICIONES EN TIEMPO REAL
     */
    setupMeasurements() {
        this.measurements = {
            averageTemperature: 0,
            maxTemperature: 0,
            minTemperature: 0,
            totalHeatFlow: 0,
            thermalEnergy: 0,
            rayleighNumber: 0,
            nusseltNumber: 0
        };

        // Buffer para análisis de datos
        this.measurementHistory = [];
        this.maxHistoryLength = 1000;
    }

    /**
     * RENDERIZADO PRINCIPAL
     */
    render() {
        const gl = this.gl;

        // Configurar viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Obtener textura de temperatura del simulador
        const temperatureTexture = this.thermalGas.getTemperatureTexture();

        switch (this.visualizationMode) {
            case 'heatmap':
                this.renderHeatmap(temperatureTexture);
                break;

            case 'isotherms':
                this.renderIsotherms(temperatureTexture);
                break;

            case 'flow':
                this.renderFlowVectors(temperatureTexture);
                break;

            case 'combined':
                this.renderCombined(temperatureTexture);
                break;
        }

        // Actualizar mediciones
        if (this.showMeasurements) {
            this.updateMeasurements(temperatureTexture);
        }
    }

    /**
     * RENDERIZADO DE MAPA DE CALOR
     */
    renderHeatmap(temperatureTexture) {
        const gl = this.gl;

        gl.useProgram(this.heatmapShader);
        gl.bindVertexArray(this.vao);

        // Uniforms
        gl.uniform1i(gl.getUniformLocation(this.heatmapShader, 'u_temperatureTexture'), 0);
        gl.uniform2f(gl.getUniformLocation(this.heatmapShader, 'u_temperatureRange'),
            this.temperatureRange.min, this.temperatureRange.max);
        gl.uniform1f(gl.getUniformLocation(this.heatmapShader, 'u_time'),
            performance.now() * 0.001);
        gl.uniform1i(gl.getUniformLocation(this.heatmapShader, 'u_showIsotherms'),
            this.visualizationMode === 'isotherms');

        // Bind textura
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, temperatureTexture);

        // Render
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * RENDERIZADO DE VECTORES DE FLUJO
     */
    renderFlowVectors(temperatureTexture) {
        const gl = this.gl;

        gl.useProgram(this.flowVectorShader);
        gl.bindVertexArray(this.vao);

        // Uniforms
        gl.uniform1i(gl.getUniformLocation(this.flowVectorShader, 'u_temperatureTexture'), 0);
        gl.uniform2f(gl.getUniformLocation(this.flowVectorShader, 'u_temperatureRange'),
            this.temperatureRange.min, this.temperatureRange.max);
        gl.uniform1f(gl.getUniformLocation(this.flowVectorShader, 'u_vectorScale'), 5.0);
        gl.uniform2f(gl.getUniformLocation(this.flowVectorShader, 'u_resolution'),
            this.canvas.width, this.canvas.height);

        // Bind textura
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, temperatureTexture);

        // Render
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * MEDICIONES Y ANÁLISIS EN TIEMPO REAL
     */
    updateMeasurements(temperatureTexture) {
        // Leer datos de temperatura de la GPU
        const tempData = this.readTemperatureData(temperatureTexture);

        // Calcular estadísticas básicas
        let sum = 0, min = Infinity, max = -Infinity;
        let totalFlow = 0;

        for (let i = 0; i < tempData.length; i++) {
            const temp = tempData[i];
            sum += temp;
            min = Math.min(min, temp);
            max = Math.max(max, temp);
        }

        this.measurements.averageTemperature = sum / tempData.length;
        this.measurements.minTemperature = min;
        this.measurements.maxTemperature = max;

        // Calcular números adimensionales
        this.calculateDimensionlessNumbers();

        // Almacenar en historial
        this.measurementHistory.push({
            time: performance.now(),
            ...this.measurements
        });

        if (this.measurementHistory.length > this.maxHistoryLength) {
            this.measurementHistory.shift();
        }

        // Actualizar UI
        this.updateMeasurementDisplay();
    }

    /**
     * CALCULAR NÚMEROS ADIMENSIONALES
     */
    calculateDimensionlessNumbers() {
        const ΔT = this.measurements.maxTemperature - this.measurements.minTemperature;
        const g = this.thermalGas.getGravity();
        const α = this.thermalGas.getDiffusivity();
        const ν = 1e-6; // Viscosidad cinemática (simplificado)
        const β = 1e-3; // Coeficiente expansión térmica (simplificado)
        const L = 1.0;   // Longitud característica

        // Número de Rayleigh: Ra = gβΔTL³/(να)
        this.measurements.rayleighNumber = (g * β * ΔT * L * L * L) / (ν * α);

        // Número de Nusselt (simplificado basado en convección)
        if (this.measurements.rayleighNumber > 1708) {
            this.measurements.nusseltNumber = 0.54 * Math.pow(this.measurements.rayleighNumber, 0.25);
        } else {
            this.measurements.nusseltNumber = 1.0; // Solo conducción
        }
    }

    /**
     * UTILIDADES
     */
    createShaderProgram(vertexSource, fragmentSource) {
        const gl = this.gl;

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Error linking shader program: ' + gl.getProgramInfoLog(program));
        }

        return program;
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Error compiling shader: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    readTemperatureData(texture) {
        const gl = this.gl;

        // Crear framebuffer para leer datos
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        // Leer píxeles
        const pixels = new Float32Array(512 * 512 * 4); // RGBA
        gl.readPixels(0, 0, 512, 512, gl.RGBA, gl.FLOAT, pixels);

        // Extraer solo canal R (temperatura)
        const temperatures = new Float32Array(512 * 512);
        for (let i = 0; i < temperatures.length; i++) {
            temperatures[i] = pixels[i * 4]; // Canal rojo
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fb);

        return temperatures;
    }

    updateMeasurementDisplay() {
        // Actualizar elementos del DOM si existen
        const updateElement = (id, value, unit = '') => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toFixed(2) + unit;
            }
        };

        updateElement('avgTemp', this.measurements.averageTemperature, '°C');
        updateElement('maxTemp', this.measurements.maxTemperature, '°C');
        updateElement('minTemp', this.measurements.minTemperature, '°C');
        updateElement('rayleigh', this.measurements.rayleighNumber, '');
        updateElement('nusselt', this.measurements.nusseltNumber, '');
    }

    /**
     * API PÚBLICA PARA CONTROL
     */
    setVisualizationMode(mode) {
        this.visualizationMode = mode;
    }

    setTemperatureRange(min, max) {
        this.temperatureRange.min = min;
        this.temperatureRange.max = max;
    }

    setColorPalette(palette) {
        this.currentPalette = palette;
    }

    toggleIsotherms(show) {
        this.showIsotherms = show;
    }

    toggleMeasurements(show) {
        this.showMeasurements = show;
    }

    getMeasurements() {
        return { ...this.measurements };
    }

    getMeasurementHistory() {
        return this.measurementHistory.slice();
    }

    exportData() {
        return {
            measurements: this.measurements,
            history: this.measurementHistory,
            settings: {
                temperatureRange: this.temperatureRange,
                visualizationMode: this.visualizationMode,
                palette: this.currentPalette
            }
        };
    }
}

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThermalRenderer;
}
