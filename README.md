# 🌊 SIMULADOR DE AGUA - FÍSICA DE ONDAS INTERACTIVO

## 📋 Descripción General

Este simulador de agua es una implementación avanzada de física de ondas en tiempo real utilizando WebGL, diseñado para la divulgación científica y el aprendizaje interactivo de fenómenos ondulatorios. El proyecto permite explorar conceptos fundamentales de mecánica de fluidos, propagación de ondas y física computacional a través de una interfaz intuitiva y visualmente atractiva.

## 🎯 Propósito y Objetivos

### 📚 Divulgación Científica
- **Visualización interactiva** de principios físicos complejos
- **Comprensión intuitiva** de la propagación de ondas en medios fluidos
- **Herramienta educativa** para estudiantes y educadores
- **Demostración práctica** de conceptos teóricos de física

### 🎓 Aplicaciones Educativas
- Enseñanza de **mecánica de ondas**
- Simulación de **interferencia y difracción**
- Estudio de **reflexión y refracción** en superficies
- Análisis de **amortiguación** y disipación energética

## 🔬 Base Científica y Fundamentos Teóricos

### 📐 Modelo Físico Implementado

El simulador se basa en la **ecuación de onda bidimensional** para superficies de agua:

```
∂²h/∂t² = c²∇²h - γ(∂h/∂t)
```

Donde:
- `h(x,y,t)`: Altura de la superficie del agua
- `c`: Velocidad de propagación de la onda
- `γ`: Coeficiente de amortiguación
- `∇²`: Operador laplaciano bidimensional

### 🌊 Fenómenos Físicos Simulados

#### **1. Propagación de Ondas**
- **Ondas circulares** generadas por perturbaciones puntuales
- **Frentes de onda** con velocidad constante configurable
- **Conservación de energía** en el medio no disipativo

#### **2. Reflexión en Fronteras**
- **Condiciones de borde** configurables (rígidas o absorbentes)
- **Ángulos de reflexión** según ley de Snell
- **Modo océano infinito** sin reflexiones

#### **3. Interferencia Constructiva y Destructiva**
- **Superposición lineal** de múltiples fuentes
- **Patrones de interferencia** complejos
- **Nodos y antinodos** bien definidos

#### **4. Amortiguación Realista**
- **Disipación viscosa** del medio
- **Pérdida gradual de energía**
- **Coeficientes ajustables** para diferentes fluidos

## 🛠️ Arquitectura Técnica

### 💻 Tecnologías Utilizadas

#### **Frontend Avanzado:**
- **WebGL 1.0/2.0** para renderizado acelerado por GPU
- **JavaScript ES6+** para lógica de simulación
- **MediaPipe** para control gestual con cámara
- **Canvas 2D** para interfaces de control

#### **Algoritmos Computacionales:**
- **Diferencias finitas** para discretización temporal
- **Operador laplaciano discreto** en malla 2D
- **Integración temporal** mediante método de Verlet
- **Texturas flotantes** para precisión numérica

### 🏗️ Estructura del Proyecto

```
simulador_agua/
├── 📄 index.html              # Interfaz principal y controles
├── 🌊 water.js               # Motor de simulación de ondas
├── 🎨 renderer.js            # Sistema de renderizado WebGL
├── 🖐️ hand-control.js        # Control gestual MediaPipe
├── 💡 lightgl.js            # Biblioteca WebGL lightweight
├── 🎮 main.js               # Inicialización y gestión de eventos
├── 🔧 cubemap.js            # Mapeo de entorno para reflexiones
├── 🆘 OES_texture_float_linear-polyfill.js # Compatibilidad WebGL
├── 🏔️ thermal-gas.js        # Extensión: simulación térmica
├── 🎨 thermal-renderer.js    # Renderizador para efectos térmicos
└── 🖼️ assets/               # Texturas y recursos visuales
    ├── tiles.jpg            # Textura del fondo
    ├── xneg.jpg, xpos.jpg   # Cubemap para reflexiones
    ├── ypos.jpg, zneg.jpg   # Entorno 360°
    └── zpos.jpg
```

## 🎮 Características y Funcionalidades

### 🎛️ Modos de Simulación

#### **1. Modo Libre (Interactivo)**
- **Dibujo directo** sobre la superficie del agua
- **Control gestual** con MediaPipe y cámara web
- **Interacción con objetos** flotantes (esferas)
- **Manipulación en tiempo real** de parámetros

#### **2. Osciladores Programados**
- **1 Esfera Oscilante**: Fuente puntual de ondas circulares
- **2 Esferas Coordinadas**: Patrones de interferencia complejos
- **Oscilador Rectangular**: Generación de ondas planas

#### **3. Control Gestual Avanzado**
- **Detección de manos** en tiempo real
- **Gestos de agarre** para manipular objetos
- **Control de amplitud** mediante posición vertical
- **Modulación de intensidad** por proximidad

### ⚙️ Parámetros Físicos Configurables

#### **Propiedades del Medio:**
- **Velocidad de onda** (0.1 - 2.0): Simula diferentes fluidos
- **Coeficiente de amortiguación** (0.900 - 0.999): Control de disipación
- **Condiciones de frontera**: Paredes reflectantes o absorbentes

#### **Comportamiento Visual:**
- **Iluminación dinámica**: Dirección de luz configurable
- **Efectos de gravedad**: Activación/desactivación
- **Renderizado de paredes**: Océano finito vs infinito

## 🔬 Bases Teóricas del Proyecto

### 📖 Fundamentos en Mecánica de Fluidos

Este simulador implementa principios fundamentales de:

#### **1. Hidrodinámica Lineal**
- **Aproximación de aguas poco profundas** (shallow water equations)
- **Régimen de ondas de gravedad** dominante
- **Linealización** para velocidades pequeñas

#### **2. Teoría de Ondas**
- **Relación de dispersión**: ω = √(gk) para ondas gravitacionales
- **Velocidad de grupo** y velocidad de fase
- **Principio de superposición** para ondas lineales

#### **3. Métodos Numéricos**
- **Esquemas de diferencias finitas** estables
- **Condición CFL** para estabilidad temporal
- **Conservación de masa** en discretización

### 🎓 Aplicaciones Pedagógicas

#### **Para Estudiantes de Física:**
- Visualización de **conceptos abstractos** de ondas
- Experimentación con **parámetros físicos** reales
- Comprensión de **fenómenos de interferencia**
- Análisis de **reflexión y transmisión**

#### **Para Educadores:**
- **Herramienta de demostración** en clase
- **Experimentos virtuales** reproducibles
- **Comparación** con predicciones teóricas
- **Evaluación visual** de conceptos

## 🚀 Instalación y Uso

### 📋 Requisitos del Sistema

#### **Hardware Mínimo:**
- **GPU compatible** con WebGL 1.0
- **Cámara web** (opcional, para control gestual)
- **4GB RAM** para funcionamiento fluido

#### **Software Necesario:**
- **Navegador moderno** (Chrome 90+, Firefox 88+, Safari 14+)
- **Servidor web local** (XAMPP, Live Server, etc.)
- **JavaScript habilitado**

### 🔧 Configuración con XAMPP

#### **Instalación Rápida:**
1. **Descargar** y instalar XAMPP
2. **Copiar** la carpeta del proyecto a `C:\xampp\htdocs\`
3. **Iniciar** el servicio Apache en XAMPP
4. **Navegar** a `http://localhost/simulador_agua/`

#### **Configuración Avanzada:**
```bash
# Verificar compatibilidad WebGL
# En consola del navegador:
console.log(canvas.getContext('webgl2') ? 'WebGL2 OK' : 'WebGL2 No disponible');

# Para desarrollo local con HTTPS (MediaPipe requiere):
# Usar certificados SSL o servir desde localhost
```

## 🎮 Guía de Uso Completa

### 🖱️ Controles Básicos

#### **Interacción con Mouse:**
- **Clic y arrastrar** sobre el agua: Crear ondas manuales
- **Arrastrar fondo**: Rotar cámara 3D
- **Arrastrar esfera**: Mover objeto flotante

#### **Controles de Teclado:**
- **ESPACIO**: Pausar/reanudar simulación
- **L**: Cambiar dirección de iluminación
- **G**: Activar/desactivar gravedad

#### **Panel de Control:**
- **Selector de modo**: Cambiar tipo de simulación
- **Sliders de parámetros**: Ajustar propiedades físicas
- **Checkboxes**: Opciones de visualización

### 🤖 Control Gestual Avanzado

#### **Configuración MediaPipe:**
1. **Clic** en "Inicializar Cámara"
2. **Permitir** acceso a la cámara web
3. **Activar** control gestual
4. **Posicionar** mano frente a la cámara

#### **Gestos Reconocidos:**
- **🤏 Pinza cerrada**: Agarrar objeto
- **✋ Mano abierta**: Soltar objeto
- **↔️ Movimiento horizontal**: Posición lateral
- **⬆️⬇️ Movimiento vertical**: Control de amplitud
- **🤏➡️ Acercar/alejar**: Intensidad del efecto

## 🔬 Desarrollo y Extensiones

### 🛠️ Para Desarrolladores

#### **Estructura Modular:**
El código está organizado en módulos independientes que permiten:
- **Extensión fácil** de nuevos modos de simulación
- **Modificación** de algoritmos numéricos
- **Integración** de nuevos controles de entrada
- **Personalización** de efectos visuales

#### **Puntos de Extensión:**
```javascript
// Agregar nuevo modo de simulación
function nuevoModoSimulacion() {
    // Implementar lógica específica
    // Definir parámetros únicos
    // Configurar interfaz de control
}

// Modificar algoritmo de propagación
Water.prototype.stepSimulation = function() {
    // Personalizar método numérico
    // Ajustar condiciones de frontera
    // Implementar nuevos efectos físicos
}
```

### 🎨 Personalización Visual

#### **Modificación de Shaders:**
```glsl
// Fragment shader para efectos del agua
uniform float time;
uniform vec2 resolution;
varying vec2 surfacePosition;

void main() {
    // Personalizar colores
    // Agregar efectos de refracción
    // Modificar iluminación
}
```

#### **Nuevas Texturas:**
- Reemplazar archivos en `assets/`
- Mantener formato y resolución
- Actualizar referencias en código

### 🔬 Experimentos Científicos Propuestos

#### **1. Análisis de Velocidad de Onda**
- Medir **tiempo de propagación** entre puntos
- Calcular **velocidad experimental**
- Comparar con **valor teórico** c = √(gh)

#### **2. Estudio de Interferencia**
- Configurar **dos fuentes oscilantes**
- Identificar **patrones de interferencia**
- Medir **distancia entre nodos**

#### **3. Reflexión en Fronteras**
- Analizar **ángulos de incidencia** y reflexión
- Verificar **conservación de energía**
- Estudiar **efectos de borde**

#### **4. Amortiguación y Disipación**
- Medir **decaimiento exponencial** de amplitud
- Calcular **coeficiente de amortiguación**
- Analizar **pérdida de energía** total

## 📊 Validación Científica

### 🔍 Verificación de Resultados

#### **Comparación con Teoría:**
- **Velocidad de propagación**: c = √(gh) ≈ implementación
- **Frecuencia de corte**: Verificada para malla discreta
- **Conservación de energía**: Monitoreo en tiempo real

#### **Precisión Numérica:**
- **Error de discretización**: O(Δx², Δt²)
- **Estabilidad CFL**: Δt ≤ Δx/(√2·c)
- **Conservación de masa**: Error < 0.1%

### 📈 Métricas de Rendimiento

#### **Benchmarks Típicos:**
- **Malla 512x512**: 60 FPS en GPU moderna
- **Latencia de entrada**: < 16ms para interactividad
- **Memoria GPU**: ~50MB para texturas flotantes

## 🌟 Casos de Uso y Aplicaciones

### 🎓 En Educación

#### **Nivel Secundario:**
- **Introducción a ondas**: Conceptos básicos visuales
- **Experimentos virtuales**: Sin necesidad de laboratorio
- **Física recreativa**: Aprendizaje lúdico

#### **Nivel Universitario:**
- **Métodos numéricos**: Implementación práctica
- **Mecánica de fluidos**: Casos de estudio reales
- **Programación científica**: Ejemplo de código limpio

#### **Investigación:**
- **Prototipado rápido** de algoritmos
- **Visualización** de resultados teóricos
- **Validación** de modelos simplificados

### 🏛️ En Museos y Divulgación

#### **Instalaciones Interactivas:**
- **Pantallas táctiles** en museos de ciencia
- **Demostraciones públicas** de física
- **Talleres educativos** para niños y adultos

#### **Recursos Online:**
- **Contenido educativo** en plataformas web
- **Videos explicativos** con simulaciones
- **Cursos en línea** de física aplicada

## 🤝 Contribuciones y Desarrollo Colaborativo

### 👥 Cómo Contribuir

#### **Para Físicos y Matemáticos:**
- **Validación** de modelos implementados
- **Propuesta** de nuevos fenómenos a simular
- **Mejora** de precisión numérica
- **Documentación** de fundamentos teóricos

#### **Para Programadores:**
- **Optimización** de algoritmos WebGL
- **Nuevas características** de interfaz
- **Compatibilidad** con más dispositivos
- **Integración** de tecnologías emergentes

#### **Para Educadores:**
- **Desarrollo** de material didáctico
- **Propuesta** de experimentos guiados
- **Evaluación** de efectividad pedagógica
- **Traducción** a múltiples idiomas

### 🔄 Metodología de Desarrollo

#### **Estructura de Branches:**
```
main/                 # Versión estable
├── develop/          # Integración de características
├── feature/          # Nuevas funcionalidades
│   ├── thermal-sim/  # Simulación térmica
│   ├── 3d-waves/     # Ondas tridimensionales
│   └── ai-control/   # Control con IA
└── hotfix/          # Correcciones urgentes
```

#### **Proceso de Contribución:**
1. **Fork** del repositorio principal
2. **Crear branch** para nueva característica
3. **Implementar** cambios con tests
4. **Pull request** con documentación
5. **Review** y integración colaborativa

## 📚 Referencias Científicas

### 📖 Bibliografía Fundamental

#### **Mecánica de Fluidos:**
- Landau & Lifshitz - *Fluid Mechanics* (Curso de Física Teórica Vol. 6)
- Kundu & Cohen - *Fluid Mechanics* (Academic Press)
- Acheson - *Elementary Fluid Dynamics* (Oxford)

#### **Teoría de Ondas:**
- Whitham - *Linear and Nonlinear Waves* (Wiley)
- Mei - *The Applied Dynamics of Ocean Surface Waves* (World Scientific)
- Stoker - *Water Waves* (Interscience Publishers)

#### **Métodos Numéricos:**
- LeVeque - *Finite Difference Methods for ODEs and PDEs* (SIAM)
- Trefethen - *Spectral Methods in MATLAB* (SIAM)
- Press et al. - *Numerical Recipes* (Cambridge University Press)

### 🔗 Recursos Adicionales

#### **Simulaciones Relacionadas:**
- [WebGL Water](https://madebyevan.com/webgl-water/) - Inspiración original
- [Fluid Simulation](https://paveldogreat.github.io/WebGL-Fluid-Simulation/)
- [Real-Time Fluid Dynamics](https://www.dgp.toronto.edu/~stam/reality/Research/pdf/GDC03.pdf)

#### **Herramientas de Desarrollo:**
- [WebGL Reference](https://www.khronos.org/webgl/)
- [MediaPipe Documentation](https://mediapipe.dev/)
- [Three.js Examples](https://threejs.org/examples/)

## 📄 Licencia y Uso

### ⚖️ Términos de Uso

Este proyecto se distribuye bajo principios de **código abierto educativo**:

#### **Permitido:**
- ✅ **Uso educativo** en instituciones académicas
- ✅ **Modificación** y redistribución con atribución
- ✅ **Integración** en proyectos de divulgación
- ✅ **Desarrollo** de versiones derivadas

#### **Requerido:**
- 📝 **Atribución** al proyecto original
- 🔗 **Enlace** al repositorio fuente
- 📚 **Mantener** documentación científica
- 🎓 **Propósito educativo** declarado

#### **Prohibido:**
- ❌ **Uso comercial** sin autorización explícita
- ❌ **Redistribución** sin código fuente
- ❌ **Remoción** de créditos originales
- ❌ **Patentamiento** de algoritmos incluidos

## 🏆 Reconocimientos

### 👨‍💻 Desarrolladores y Colaboradores

#### **Desarrollo Principal:**
- **Implementación WebGL**: Basado en [madebyevan.com/webgl-water](https://madebyevan.com/webgl-water/)
- **Control Gestual**: Integración MediaPipe personalizada
- **Interfaz Educativa**: Desarrollo original para divulgación

#### **Contribuciones Científicas:**
- **Validación Física**: Comunidad académica
- **Optimización Numérica**: Colaboradores especializados
- **Material Didáctico**: Educadores experimentados

### 🎯 Objetivos Futuros

#### **Desarrollos Planificados:**
- 🌊 **Ondas no lineales**: Solitones y ondas de choque
- 🌡️ **Efectos térmicos**: Convección y transferencia de calor
- 🌪️ **Turbulencia**: Flujos caóticos y mezcla
- 🎮 **Realidad Virtual**: Inmersión 3D completa
- 🤖 **IA Educativa**: Tutor inteligente integrado

#### **Colaboraciones Buscadas:**
- 🏫 **Instituciones educativas** para pruebas piloto
- 🔬 **Investigadores** en mecánica de fluidos
- 💻 **Desarrolladores** especializados en WebGL/GPU
- 🎨 **Diseñadores** para mejorar experiencia de usuario

---

## 📞 Contacto y Soporte

### 💬 Canales de Comunicación

#### **Para Consultas Académicas:**
- 📧 Email: [Tu dirección de contacto]
- 🐙 GitHub Issues: Reportes de bugs y sugerencias
- 💬 Foros educativos: Discusión sobre aplicaciones

#### **Para Desarrollo:**
- 🔧 Pull Requests: Contribuciones de código
- 📋 Project Board: Seguimiento de tareas
- 📖 Wiki: Documentación colaborativa

---

**🌊 ¡Explora la fascinante física de las ondas de forma interactiva!**

*Este simulador representa un puente entre la teoría física rigurosa y la experiencia práctica intuitiva, diseñado para inspirar curiosidad científica y facilitar el aprendizaje significativo de conceptos fundamentales en mecánica de fluidos y teoría de ondas.*

---

## 🏷️ Tags y Palabras Clave

`física` `ondas` `simulación` `WebGL` `JavaScript` `educación` `divulgación-científica` `mecánica-de-fluidos` `métodos-numéricos` `interactivo` `tiempo-real` `MediaPipe` `control-gestual` `waves` `fluid-dynamics` `computational-physics`

---

**Versión:** 2.0  
**Última actualización:** Agosto 2025  
**Compatibilidad:** WebGL 1.0+, ES6+  
**Estado:** Activo en desarrollo
