/**
 * Control Modular de Manos con MediaPipe
 * Permite agarrar la pelota con la mano en modo libre
 * - Mano abierta: suelta la pelota
 * - Mano cerrada: agarra la pelota (como si estuviera clickeada)
 */

class HandControl {
    constructor() {
        this.camera = null;
        this.hands = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.isInitialized = false;
        this.isHandGrasping = false;
        this.handPosition = { x: 0, y: 0, z: 0 }; // Agregamos coordenada Z para profundidad
        this.isEnabled = false;
        this.onHandGraspChange = null; // Callback para cambios de agarre
        this.onHandPositionChange = null; // Callback para cambios de posición

        // Configuración de detección
        this.graspThreshold = 0.7; // Umbral para detectar puño cerrado
        this.smoothingFactor = 0.8; // Factor de suavizado para posición

        // Control de profundidad mejorado
        this.previousHandZ = 0; // Z anterior para detectar acercamiento/alejamiento
        this.depthSensitivity = 3.0; // Sensibilidad del control de profundidad Z
        this.heightSensitivity = 2.0; // Sensibilidad del control de altura Y
        this.maxDepth = 1.5; // Máxima profundidad hacia adelante
        this.minDepth = -1.5; // Máxima profundidad hacia atrás
        this.maxHeight = 1.0; // Altura máxima (sobre el agua)
        this.minHeight = -1.0; // Altura mínima (bajo el agua)
    }    /**
     * Inicializa MediaPipe y la cámara
     */
    async initialize() {
        try {
            // Crear elementos de video y canvas para MediaPipe
            this.createVideoElements();

            // Cargar MediaPipe Hands
            await this.loadMediaPipe();

            // Inicializar cámara
            await this.initializeCamera();

            this.isInitialized = true;
            console.log('Control de manos inicializado correctamente');
            return true;
        } catch (error) {
            console.error('Error al inicializar control de manos:', error);
            return false;
        }
    }

    /**
     * Crea los elementos HTML necesarios para el video
     */
    createVideoElements() {
        // Video element (oculto)
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        document.body.appendChild(this.videoElement);

        // Canvas para mostrar la detección (opcional, pequeño)
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.width = 320;
        this.canvasElement.height = 240;
        this.canvasElement.style.position = 'absolute';
        this.canvasElement.style.top = '10px';
        this.canvasElement.style.right = '10px';
        this.canvasElement.style.width = '160px';
        this.canvasElement.style.height = '120px';
        this.canvasElement.style.border = '2px solid #00ff00';
        this.canvasElement.style.borderRadius = '8px';
        this.canvasElement.style.zIndex = '1001';
        this.canvasElement.style.display = 'none'; // Oculto por defecto
        document.body.appendChild(this.canvasElement);
    }

    /**
     * Carga MediaPipe Hands desde CDN
     */
    async loadMediaPipe() {
        return new Promise((resolve, reject) => {
            // Cargar MediaPipe desde CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
            script.onload = () => {
                // Cargar Camera Utils
                const cameraScript = document.createElement('script');
                cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';
                cameraScript.onload = () => {
                    this.initializeMediaPipeHands();
                    resolve();
                };
                cameraScript.onerror = reject;
                document.head.appendChild(cameraScript);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Inicializa MediaPipe Hands
     */
    initializeMediaPipeHands() {
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));
    }

    /**
     * Inicializa la cámara
     */
    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });

            this.videoElement.srcObject = stream;

            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.camera = new Camera(this.videoElement, {
                        onFrame: async () => {
                            if (this.isEnabled) {
                                await this.hands.send({ image: this.videoElement });
                            }
                        },
                        width: 640,
                        height: 480
                    });
                    resolve();
                };
            });
        } catch (error) {
            throw new Error('No se pudo acceder a la cámara: ' + error.message);
        }
    }

    /**
     * Procesa los resultados de MediaPipe
     */
    onResults(results) {
        const canvasCtx = this.canvasElement.getContext('2d');

        // Limpiar canvas
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        // Dibujar imagen de video (opcional)
        if (this.canvasElement.style.display !== 'none') {
            canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const hand = results.multiHandLandmarks[0];

            // Calcular posición de la mano (punto medio de la palma)
            const palmCenter = this.calculatePalmCenter(hand);

            // NUEVO MAPEO SEGÚN PLANO DE CÁMARA:
            // Y de cámara (arriba-abajo) → Y del simulador (altura de pelota)
            // X de cámara (izq-der) → X del simulador (como está)
            // Z de MediaPipe (profundidad real) → Z del simulador

            // Calcular altura Y directamente desde Y de cámara
            // Y=0 (arriba cámara) → altura alta, Y=1 (abajo cámara) → altura baja
            let targetY = (palmCenter.y - 0.5) * -1 * this.heightSensitivity; // Corregir sentido: arriba=positivo, abajo=negativo

            // Calcular profundidad Z desde la coordenada Z de MediaPipe si está disponible
            let targetZ = this.handPosition.z; // Mantener Z anterior por defecto

            // MediaPipe proporciona Z como profundidad relativa (0 = cerca, mayor = lejos)
            if (hand[9] && hand[9].z !== undefined) { // Usar landmark del dedo medio como referencia
                const currentHandZ = hand[9].z;
                const deltaZ = currentHandZ - this.previousHandZ;

                // Acercar mano (Z menor) = hacia adelante (Z positivo)
                // Alejar mano (Z mayor) = hacia atrás (Z negativo)
                targetZ += -deltaZ * this.depthSensitivity;
                this.previousHandZ = currentHandZ;
            }

            // Aplicar límites
            targetY = Math.max(this.minHeight, Math.min(this.maxHeight, targetY));
            targetZ = Math.max(this.minDepth, Math.min(this.maxDepth, targetZ));

            // Suavizar todas las posiciones
            this.handPosition.x = this.handPosition.x * this.smoothingFactor + palmCenter.x * (1 - this.smoothingFactor);
            this.handPosition.y = this.handPosition.y * this.smoothingFactor + targetY * (1 - this.smoothingFactor);
            this.handPosition.z = this.handPosition.z * this.smoothingFactor + targetZ * (1 - this.smoothingFactor);

            // Detectar si la mano está cerrada (puño)
            const isGrasping = this.detectGraspGesture(hand);

            // Si cambió el estado de agarre
            if (isGrasping !== this.isHandGrasping) {
                this.isHandGrasping = isGrasping;
                if (this.onHandGraspChange) {
                    this.onHandGraspChange(isGrasping, this.handPosition);
                }
            }

            // Notificar cambio de posición
            if (this.onHandPositionChange) {
                this.onHandPositionChange(this.handPosition, isGrasping);
            }

            // Dibujar en canvas si está visible
            if (this.canvasElement.style.display !== 'none') {
                this.drawHandLandmarks(canvasCtx, hand, isGrasping);
            }
        } canvasCtx.restore();
    }

    /**
     * Calcula el centro de la palma
     */
    calculatePalmCenter(hand) {
        // Usar landmarks de la base de la palma
        const palmLandmarks = [0, 1, 2, 5, 9, 13, 17]; // Landmarks clave de la palma
        let x = 0, y = 0;

        palmLandmarks.forEach(index => {
            x += hand[index].x;
            y += hand[index].y;
        });

        return {
            x: x / palmLandmarks.length,
            y: y / palmLandmarks.length
        };
    }

    /**
     * Detecta si la mano está haciendo gesto de agarre (puño cerrado)
     */
    detectGraspGesture(hand) {
        // Calcular distancias entre puntas de dedos y palma
        const fingerTips = [4, 8, 12, 16, 20]; // Puntas de dedos
        const palmCenter = this.calculatePalmCenter(hand);

        let closedFingers = 0;

        fingerTips.forEach(tipIndex => {
            const tip = hand[tipIndex];
            const distance = Math.sqrt(
                Math.pow(tip.x - palmCenter.x, 2) +
                Math.pow(tip.y - palmCenter.y, 2)
            );

            // Si la distancia es menor al umbral, el dedo está cerrado
            if (distance < 0.08) { // Ajustar según necesidad
                closedFingers++;
            }
        });

        // Si al menos 3 dedos están cerrados, considerar puño cerrado
        return closedFingers >= 3;
    }

    /**
     * Dibuja los landmarks de la mano en el canvas
     */
    drawHandLandmarks(ctx, hand, isGrasping) {
        // Dibujar puntos de la mano
        hand.forEach((landmark, index) => {
            const x = landmark.x * this.canvasElement.width;
            const y = landmark.y * this.canvasElement.height;

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = isGrasping ? '#ff0000' : '#00ff00';
            ctx.fill();
        });

        // Dibujar estado y información de posición
        ctx.fillStyle = isGrasping ? '#ff0000' : '#00ff00';
        ctx.font = '14px Arial';
        ctx.fillText(isGrasping ? 'AGARRANDO' : 'ABIERTO', 10, 20);

        // Mostrar información de posición 3D
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(`X: ${this.handPosition.x.toFixed(2)}`, 10, 40);
        ctx.fillText(`Amplitud: ${Math.abs(this.handPosition.y).toFixed(2)}`, 10, 55);
        ctx.fillText(`Intensidad: ${((this.handPosition.z + 1.5) / 3.0).toFixed(2)}`, 10, 70);

        // Indicador visual de altura Y
        const heightBarWidth = 80;
        const heightBarHeight = 8;
        const heightBarX = 120;
        const heightBarY = 40;

        // Barra de altura
        ctx.fillStyle = '#444444';
        ctx.fillRect(heightBarX, heightBarY, heightBarWidth, heightBarHeight);

        const normalizedY = (Math.abs(this.handPosition.y) - 0) / (this.maxHeight - 0); // Amplitud siempre positiva
        const heightBarFill = normalizedY * heightBarWidth;
        ctx.fillStyle = '#00aaff'; // Azul para amplitud
        ctx.fillRect(heightBarX, heightBarY, heightBarFill, heightBarHeight);

        // Indicador visual de intensidad Z
        const intensityBarWidth = 80;
        const intensityBarHeight = 8;
        const intensityBarX = 120;
        const intensityBarY = 60;

        // Barra de intensidad
        ctx.fillStyle = '#333333';
        ctx.fillRect(intensityBarX, intensityBarY, intensityBarWidth, intensityBarHeight);

        const normalizedZ = (this.handPosition.z - this.minDepth) / (this.maxDepth - this.minDepth);
        const intensityBarFill = normalizedZ * intensityBarWidth;
        ctx.fillStyle = this.handPosition.z > 0 ? '#00ff00' : '#ff6600';
        ctx.fillRect(intensityBarX, intensityBarY, intensityBarFill, intensityBarHeight);

        // Etiquetas
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.fillText('Min↓', heightBarX, heightBarY + heightBarHeight + 10);
        ctx.fillText('↑Max', heightBarX + heightBarWidth - 20, heightBarY + heightBarHeight + 10);
        ctx.fillText('Suave←', intensityBarX, intensityBarY + intensityBarHeight + 10);
        ctx.fillText('→Intenso', intensityBarX + intensityBarWidth - 35, intensityBarY + intensityBarHeight + 10);
    }    /**
     * Convierte posición de mano a coordenadas del simulador
     */
    handToSimulatorCoords(handPos, canvasWidth, canvasHeight) {
        // Mapeo similar a los osciladores:
        // targetY funciona como amplitud (controla altura desde nivel de agua)
        // targetZ funciona como profundidad/intensidad
        return {
            x: (handPos.x - 0.5) * 2, // -1 a 1 (izquierda-derecha de cámara)
            y: 0.0 + handPos.y, // Nivel de agua (0.0) + amplitud calculada
            z: handPos.z, // Profundidad/intensidad
            amplitude: Math.abs(handPos.y), // Amplitud como valor absoluto
            intensity: (handPos.z + 1.5) / 3.0 // Intensidad normalizada 0-1
        };
    }

    /**
     * Habilita el control de manos
     */
    enable() {
        if (!this.isInitialized) {
            console.warn('Control de manos no inicializado');
            return;
        }

        // Resetear todas las posiciones al habilitar
        this.handPosition.x = 0.5; // Centro X
        this.handPosition.y = 0; // Centro Y (altura)
        this.handPosition.z = 0; // Centro Z (profundidad)
        this.previousHandZ = 0; // Reset Z anterior

        this.isEnabled = true;
        this.camera.start();
        console.log('Control de manos habilitado');
    }

    /**
     * Deshabilita el control de manos
     */
    disable() {
        this.isEnabled = false;
        if (this.camera) {
            this.camera.stop();
        }
        console.log('Control de manos deshabilitado');
    }

    /**
     * Muestra/oculta el canvas de depuración
     */
    toggleDebugCanvas(show = null) {
        if (show === null) {
            show = this.canvasElement.style.display === 'none';
        }
        this.canvasElement.style.display = show ? 'block' : 'none';
    }

    /**
     * Limpia recursos
     */
    destroy() {
        this.disable();

        if (this.videoElement) {
            const stream = this.videoElement.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            this.videoElement.remove();
        }

        if (this.canvasElement) {
            this.canvasElement.remove();
        }

        this.isInitialized = false;
    }
}

// Exportar para uso global
window.HandControl = HandControl;
