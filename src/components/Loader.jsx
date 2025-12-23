import React from 'react';

const loaderStyles = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#00ffcc',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  textAlign: 'center',
};

const spinnerStyles = {
  border: '4px solid rgba(0, 255, 204, 0.3)',
  borderTop: '4px solid #00ffcc',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  animation: 'spin 1s linear infinite',
  margin: '0 auto 10px',
};

const keyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const Loader = ({ text }) => (
  <>
    <style>{keyframes}</style>
    <div style={loaderStyles}>
      <div style={spinnerStyles}></div>
      {text}
    </div>
  </>
);

export default Loader;
