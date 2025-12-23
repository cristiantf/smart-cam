import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';
import { esTranslation } from './translations.js';
import Loader from './components/Loader.jsx'; 
import './App.css';

// --- CONSTANTES ---
const MODEL_CONFIG = {
  base: 'mobilenet_v2',
  modelUrl: '/models/coco-ssd/model.json',
};
const VIDEO_CONFIG = {
  audio: false,
  video: {
    facingMode: 'environment',
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
};
const PREDICTION_THRESHOLD = 0.66; // Confianza mínima
const SPEECH_THROTTLE_MS = 3000;   // Intervalo para hablar

function App() {
  const videoRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastSpokenTime = useRef(0);

  const [status, setStatus] = useState({ loading: true, message: 'Cargando IA Offline...' });
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [facingMode, setFacingMode] = useState('environment');

  // 1. CARGA DEL MODELO
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await cocossd.load(MODEL_CONFIG);
        setModel(loadedModel);
        setStatus({ loading: false, message: 'IA Lista. Apunta la cámara a un objeto.' });
      } catch (err) {
        console.error("Error cargando modelo:", err);
        setStatus({ loading: false, message: 'Error: No se encontró el modelo local.' });
      }
    };
    loadModel();
  }, []);

  // 2. LÓGICA DE PREDICCIÓN
  const runPrediction = useCallback(async () => {
    if (!model || !videoRef.current || videoRef.current.readyState !== 4) {
      animationFrameId.current = requestAnimationFrame(runPrediction);
      return;
    }

    try {
      const predictions = await model.detect(videoRef.current);

      if (predictions.length > 0 && predictions[0].score >= PREDICTION_THRESHOLD) {
        const best = predictions[0];
        const translated = esTranslation[best.class] || best.class;
        const percentage = Math.round(best.score * 100);
        
        setPrediction(`${translated.toUpperCase()} (${percentage}%)`);

        const now = Date.now();
        if (now - lastSpokenTime.current > SPEECH_THROTTLE_MS) {
          speak(translated);
          lastSpokenTime.current = now;
        }
      } else {
        setPrediction('Analizando...');
      }
    } catch (err) {
      console.warn("Frame drop o error en predicción:", err);
    }

    animationFrameId.current = requestAnimationFrame(runPrediction);
  }, [model]);


  // 3. GESTIÓN DE CÁMARA Y CICLO DE VIDA
  useEffect(() => {
    const startCamera = async () => {
      // Detener bucle y cámara anterior
      cancelAnimationFrame(animationFrameId.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      
      if (!model) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          ...VIDEO_CONFIG,
          video: { ...VIDEO_CONFIG.video, facingMode }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            // Iniciar bucle de predicción
            animationFrameId.current = requestAnimationFrame(runPrediction);
          };
        }
      } catch (err) {
        console.error("Error de cámara:", err);
        setStatus({ loading: false, message: 'Error: Permiso de cámara denegado.' });
      }
    };

    startCamera();

    // Limpieza al desmontar o cambiar dependencias
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [model, facingMode, runPrediction]);


  // 4. FUNCIÓN DE VOZ
  const speak = (text) => {
    if (window.speechSynthesis.speaking) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };
  
  // 5. CAPTURA DE FOTO
  const captureSnapshot = async () => {
    if (!videoRef.current || !prediction || prediction === 'Analizando...') return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Overlay de texto
      ctx.font = 'bold 40px Arial';
      const textWidth = ctx.measureText(prediction).width;
      const x = (canvas.width - textWidth) / 2;
      const y = canvas.height - 50;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x - 20, y - 45, textWidth + 40, 60);
      ctx.fillStyle = '#00ffcc';
      ctx.fillText(prediction, x, y);

      const base64Data = canvas.toDataURL('image/jpeg', 0.85);
      const fileName = `smartcam_${Date.now()}.jpg`;

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
      });

      await Toast.show({ text: '📸 Foto guardada en Documentos', duration: 'short' });
    } catch (error) {
      console.error("Error al guardar foto:", error);
      await Toast.show({ text: 'Error al guardar la foto.' });
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setStatus({ ...status, message: "Cambiando lente..." });
  };

  return (
    <div className="app-container">
      <h1 className="title">SmartCam <span style={{fontSize:'0.6em'}}>📡</span></h1>
      
      <div className="camera-wrapper">
        {status.loading && <Loader text={status.message} />}
        
        <video
          ref={videoRef}
          className="camera-view"
          style={{ display: status.loading ? 'none' : 'block' }}
          muted
          playsInline
        />

        {!status.loading && (
          <div className="prediction-overlay">
            {prediction || status.message}
          </div>
        )}
      </div>

      <div className="controls">
        <button onClick={toggleCamera} className="btn-secondary" disabled={status.loading}>
          🔄
        </button>

        <button onClick={captureSnapshot} className="btn-primary" disabled={status.loading || !prediction || prediction === 'Analizando...'}>
          📸
        </button>
      </div>
    </div>
  );
}

export default App;