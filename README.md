# SmartCam

Aplicación de cámara inteligente que utiliza TensorFlow.js para la detección de objetos en tiempo real, empaquetada como una aplicación móvil para Android utilizando Capacitor.

## Descripción

Este proyecto es una aplicación móvil que aprovecha el poder de los modelos de aprendizaje automático directamente en el dispositivo. Utiliza la cámara del teléfono para capturar video en tiempo real y, a través del modelo pre-entrenado **COCO-SSD** y **TensorFlow.js**, es capaz de identificar y etiquetar múltiples objetos en la escena.

La base del proyecto está construida con **React** y **Vite**, lo que proporciona un entorno de desarrollo rápido y moderno. **Capacitor** se utiliza para convertir la aplicación web en una aplicación nativa de Android, permitiendo el acceso a las funcionalidades del dispositivo como la cámara.

## Características

-   **Detección de objetos en tiempo real**: Identifica y dibuja cuadros delimitadores alrededor de los objetos detectados en el feed de la cámara.
-   **Modelo COCO-SSD**: Utiliza uno de los modelos de detección de objetos más populares y eficientes, capaz de reconocer 80 clases diferentes de objetos.
-   **Tecnología Web Moderna**: Construido con React 19, Vite y sin dependencias de UI externas, manteniendo el proyecto ligero.
-   **Multiplataforma (Android)**: Gracias a Capacitor, la misma base de código se ejecuta como una aplicación nativa en Android.
-   **Rendimiento en el Cliente**: Todo el procesamiento de la inferencia del modelo se realiza en el lado del cliente (en el dispositivo móvil), lo que significa que no requiere una conexión constante a un servidor para la detección.

## Requisitos Previos

-   [Node.js](https://nodejs.org/) (versión 18 o superior)
-   [Git](https://git-scm.com/)
-   [Android Studio](https://developer.android.com/studio) (para el desarrollo en Android)
-   Windows PowerShell (para descargar el modelo)

## Instalación y Puesta en Marcha

Siga estos pasos para configurar el entorno de desarrollo y ejecutar la aplicación.

### 1. Clonar el Repositorio

Clone este repositorio en su máquina local:

```bash
git clone https://github.com/tu-usuario/smart-cam.git
cd smart-cam
```

*(Reemplace `https://github.com/tu-usuario/smart-cam.git` con la URL real del repositorio si es diferente).*

### 2. Instalar Dependencias

Instale todas las dependencias del proyecto utilizando `npm`:

```bash
npm install
```

### 3. Descargar el Modelo de IA

El modelo de detección de objetos no está incluido en el repositorio. Para descargarlo, ejecute el siguiente script de PowerShell desde la raíz del proyecto.

```powershell
.\descargar_modelo.ps1
```

Este script creará la carpeta `public/models/coco-ssd` y descargará los archivos necesarios del modelo (`model.json` y los fragmentos de pesos binarios).

### 4. Ejecutar en el Navegador (Desarrollo)

Para probar la aplicación en un navegador de escritorio (sin acceso a la cámara nativa, pero útil para desarrollar la UI), utilice:

```bash
npm run dev
```

Abra la URL que se muestra en la consola (normalmente `http://localhost:5173`).

### 5. Construir y Sincronizar para Android

Una vez que haya verificado que la aplicación funciona en el navegador, puede construirla para producción y sincronizarla con la plataforma Android.

```bash
# Construye la aplicación web en el directorio 'dist'
npm run build

# Sincroniza los cambios con el proyecto de Android
npx cap sync
```

### 6. Ejecutar en Android Studio

Abra el proyecto de Android en Android Studio para compilarlo y ejecutarlo en un emulador o en un dispositivo físico.

```bash
npx cap open android
```

Una vez abierto en Android Studio, puede utilizar los controles estándar para construir y ejecutar la aplicación en su dispositivo de destino. Asegúrese de que el dispositivo tenga los permisos de cámara habilitados para la aplicación.