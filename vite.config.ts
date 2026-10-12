import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
            if (id.includes('src/components/AdminDashboard') || id.includes('src/components/SEODashboard') || id.includes('src/components/AdminTrustPanel')) {
              return 'admin-suite';
            }
            if (id.includes('src/components/PharmacyWorkspace') || id.includes('src/components/pharmacy/')) {
              return 'pharmacy-suite';
            }
            if (id.includes('src/components/PatientDashboard') || id.includes('src/components/patient/')) {
              return 'patient-suite';
            }
            if (id.includes('src/components/MedicalLibrary')) {
              return 'medical-library';
            }
            if (id.includes('src/components/LandingPage')) {
              return 'landing-page';
            }
          },
        },
      },
    },
  };
});
