import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

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
            // 1. Third-party vendor libraries
            if (id.includes('node_modules')) {
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              return 'vendor';
            }

            // 2. Feature Workspaces & Large Suites
            if (id.includes('src/components/AdminDashboard') || id.includes('src/components/SEODashboard')) {
              return 'admin-suite';
            }

            if (id.includes('src/components/PharmacyWorkspace') || id.includes('src/components/pharmacy/')) {
              return 'pharmacy-suite';
            }

            if (id.includes('src/components/PatientDashboard') || id.includes('src/components/patient/')) {
              return 'patient-suite';
            }

            if (id.includes('src/components/VerificationTerminal') || id.includes('src/components/practitioner/')) {
              return 'practitioner-suite';
            }

            if (id.includes('src/components/LandingPage')) {
              return 'landing-page';
            }

            if (id.includes('src/components/MedicalLibrary')) {
              return 'medical-library';
            }

            if (
              id.includes('src/components/MalaysiaPatientsPage') ||
              id.includes('src/components/InternationalPatientsPage') ||
              id.includes('src/components/MedicalTourism')
            ) {
              return 'patient-guides-suite';
            }

            if (
              id.includes('src/components/DashboardDesignPreview') ||
              id.includes('src/components/LandingDesignPreview') ||
              id.includes('src/components/HeaderColorSamples')
            ) {
              return 'design-previews';
            }
          },
        },
      },
    },
  };
});
