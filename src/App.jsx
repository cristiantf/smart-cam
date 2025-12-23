import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';
import './App.css';

// --- DICCIONARIO DE TRADUCCIÓN (Inglés -> Español) ---
const esTranslation = {
  person: 'persona', bicycle: 'bicicleta', car: 'auto', motorcycle: 'moto',
  airplane: 'avión', bus: 'autobús', train: 'tren', truck: 'camión',
  boat: 'barco', traffic_light: 'semáforo', fire_hydrant: 'hidrante',
  stop_sign: 'pare', parking_meter: 'parquímetro', bench: 'banco',
  bird: 'pájaro', cat: 'gato', dog: 'perro', horse: 'caballo',
  sheep: 'oveja', cow: 'vaca', elephant: 'elefante', bear: 'oso',
  zebra: 'cebra', giraffe: 'jirafa', backpack: 'mochila', umbrella: 'paraguas',
  handbag: 'bolso', tie: 'corbata', suitcase: 'maleta', frisbee: 'frisbee',
  skis: 'esquís', snowboard: 'snowboard', sports_ball: 'pelota', kite: 'cometa',
  baseball_bat: 'bate', baseball_glove: 'guante', skateboard: 'skate',
  surfboard: 'tabla surf', tennis_racket: 'raqueta', bottle: 'botella',
  wine_glass: 'copa', cup: 'taza', fork: 'tenedor', knife: 'cuchillo',
  spoon: 'cuchara', bowl: 'tazón', banana: 'plátano', apple: 'manzana',
  sandwich: 'sándwich', orange: 'naranja', broccoli: 'brócoli', carrot: 'zanahoria',
  hot_dog: 'perrito', pizza: 'pizza', donut: 'rosquilla', cake: 'pastel',
  chair: 'silla', couch: 'sofá', potted_plant: 'maceta', bed: 'cama',
  dining_table: 'mesa', toilet: 'inodoro', tv: 'TV', laptop: 'portátil',
  mouse: 'ratón', remote: 'control remoto', keyboard: 'teclado', cell_phone: 'celular',
  microwave: 'microondas', oven: 'horno', toaster: 'tostadora', sink: 'fregadero',
  refrigerator: 'nevera', book: 'libro', clock: 'reloj', vase: 'jarrón',
  scissors: 'tijeras', teddy_bear: 'osito', hair_drier: 'secador', toothbrush: 'cepillo'
};

function App() {
  const videoRef = useRef(null);
  const lastSpokenTime = useRef(0); // Control de "throttling" de voz
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState('Cargando IA Offline...');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = trasera

  // 1. CARGA DEL MODELO (MODO OFFLINE)
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        
        // Carga desde la carpeta local 'public/models/coco-ssd'
        // 'base: mobilenet_v2' asegura compatibilidad con los archivos descargados
        const loadedModel = await cocossd.load({
          base: 'mobilenet_v2',
          modelUrl: '/models/coco-ssd/model.json' 
        });

        setModel(loadedModel);
        setPrediction('IA Lista y Offline. 🚀');
      } catch (err) {
        console.error("Error cargando modelo:", err);
        setPrediction("Error: No se encontró el modelo local.");
      }
    };
    loadModel();
  }, []);

  // 2. GESTIÓN DE CÁMARA
  useEffect(() => {
    let currentStream = null;
    const startCamera = async () => {
      // Detener cámara anterior al cambiar lente
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { 
              facingMode: facingMode,
              // Optimizamos resolución para mejorar FPS en móviles
              width: { ideal: 640 }, 
              height: { ideal: 480 } 
            },
          });
          currentStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
               videoRef.current.play();
               requestAnimationFrame(predictFrame);
            };
          }
        } catch (err) {
          console.error("Error cámara:", err);
          setPrediction('Error: Permiso de cámara denegado');
        }
      }
    };

    if (model) startCamera();

    return () => {
      if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    };
  }, [model, facingMode]);

  // 3. FUNCIÓN DE VOZ (TEXT-TO-SPEECH)
  const speak = (text) => {
    if (window.speechSynthesis.speaking) return; 

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES'; // Español
    utterance.rate = 1.0; 
    window.speechSynthesis.speak(utterance);
  };

  // 4. BUCLE DE PREDICCIÓN
  const predictFrame = async () => {
    if (videoRef.current && model && videoRef.current.readyState === 4) {
      try {
        const predictions = await model.detect(videoRef.current);
        
        if (predictions.length > 0) {
          const best = predictions[0];
          
          // FILTRO: Solo mostrar si la confianza es > 66%
          if (best.score >= 0.66) {
            const translated = esTranslation[best.class] || best.class;
            const percentage = Math.round(best.score * 100);
            
            setPrediction(`${translated.toUpperCase()} (${percentage}%)`);

            // Lógica de Voz: Hablar solo cada 3 segundos
            const now = Date.now();
            if (now - lastSpokenTime.current > 3000) {
              speak(translated);
              lastSpokenTime.current = now;
            }
          } else {
            setPrediction('Analizando...');
          }
        } else {
          setPrediction('Buscando objetos...');
        }
      } catch (err) {
        console.warn("Frame drop");
      }
      requestAnimationFrame(predictFrame);
    } else {
      requestAnimationFrame(predictFrame);
    }
  };

  // 5. CAPTURA Y GUARDADO (FILESYSTEM)
  const captureSnapshot = async () => {
    if (!videoRef.current) return;

    try {
      // Crear Canvas invisible
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      // Dibujar imagen
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Dibujar Overlay (Texto y Fondo)
      const text = prediction;
      ctx.font = 'bold 40px Arial'; 
      const textWidth = ctx.measureText(text).width;
      const x = (canvas.width / 2) - (textWidth / 2);
      const y = canvas.height - 50;
      
      // Fondo negro semitransparente
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x - 20, y - 45, textWidth + 40, 60);
      
      // Texto verde
      ctx.fillStyle = '#00ffcc';
      ctx.fillText(text, x, y);

      // Convertir a Base64 y Guardar
      const base64Data = canvas.toDataURL('image/jpeg', 0.85);
      const fileName = `smartcam_${Date.now()}.jpg`;
      
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents
      });

      await Toast.show({
        text: '📸 Foto guardada en Documentos',
        duration: 'short',
        position: 'center'
      });

    } catch (error) {
      console.error(error);
      await Toast.show({ text: 'Error al guardar: ' + error.message });
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setPrediction("Cambiando lente...");
  };

  return (
    <div className="app-container">
      <h1 className="title">SmartCam <span style={{fontSize:'0.6em'}}>📡</span></h1>
      
      <div className="camera-wrapper">
        <video
          ref={videoRef}
          className="camera-view"
          muted
          playsInline
        />
        <div className="prediction-overlay">
          {prediction}
        </div>
      </div>

      <div className="controls">
        <button onClick={toggleCamera} className="btn-secondary">
          🔄
        </button>

        <button onClick={captureSnapshot} className="btn-primary">
          📸
        </button>
      </div>

      {/* ESTILOS CSS */}
      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #1a1a1a;
          color: white;
          font-family: -apple-system, system-ui, sans-serif;
          padding: 20px;
        }
        .title { margin-bottom: 20px; font-size: 2rem; }
        .camera-wrapper {
          position: relative;
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border: 3px solid #333;
          background: #000;
        }
        .camera-view { width: 100%; display: block; }
        .prediction-overlay {
          position: absolute;
          bottom: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: #00ffcc;
          padding: 10px 20px;
          border-radius: 50px;
          font-size: 1.2rem;
          font-weight: bold;
          white-space: nowrap;
          border: 1px solid rgba(0, 255, 204, 0.3);
        }
        .controls { margin-top: 30px; display: flex; gap: 30px; align-items: center; }
        .btn-primary {
          width: 80px; height: 80px; border-radius: 50%;
          background: #ff4757; border: 4px solid white;
          color: white; font-size: 32px; cursor: pointer;
          box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
        }
        .btn-secondary {
          width: 60px; height: 60px; border-radius: 50%;
          background: #2f3542; border: 1px solid #57606f;
          color: white; font-size: 24px; cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default App;