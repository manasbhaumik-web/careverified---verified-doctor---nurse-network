import { lazy } from 'react';

// Public, auth, and preview portals
export const LandingPage = lazy(() => import('../components/LandingPage'));
export const LoginPage = lazy(() => import('../components/LoginPage'));
export const AccountRecovery = lazy(() => import('../components/AccountRecovery'));
export const PractitionerPage = lazy(() => import('../components/PractitionerPage'));
export const ClinicHospitalPage = lazy(() => import('../components/ClinicHospitalPage'));
export const PharmacyPage = lazy(() => import('../components/PharmacyPage'));
export const PublicPackagesPage = lazy(() => import('../components/PublicPackagesPage'));
export const VerifyPractitionersPage = lazy(() => import('../components/VerifyPractitionersPage'));
export const MalaysiaPatientsPage = lazy(() => import('../components/MalaysiaPatientsPage'));
export const InternationalPatientsPage = lazy(() => import('../components/InternationalPatientsPage'));
export const DashboardDesignPreview = lazy(() => import('../components/DashboardDesignPreview'));
export const LandingDesignPreview = lazy(() => import('../components/LandingDesignPreview'));
export const HeaderColorSamples = lazy(() => import('../components/HeaderColorSamples'));

// Role workspaces
export const PatientDashboard = lazy(() => import('../components/PatientDashboard'));
export const VerificationTerminal = lazy(() => import('../components/VerificationTerminal'));
export const FacilityWorkspace = lazy(() => import('../components/FacilityWorkspace'));
export const PharmacyWorkspace = lazy(() => import('../components/PharmacyWorkspace'));
export const AdminDashboard = lazy(() => import('../workspaces/admin/AdminDashboard'));

// Feature modules
export const SearchHub = lazy(() => import('../components/SearchHub'));
export const AISymptomMatcher = lazy(() => import('../domains/telemedicine/AISymptomMatcher'));
export const ProfessionalProfile = lazy(() => import('../components/ProfessionalProfile'));
export const JobMarket = lazy(() => import('../domains/staffing/JobMarket'));
export const SecureMessenger = lazy(() => import('../domains/telemedicine/SecureMessenger'));
export const MedicalLibrary = lazy(() => import('../components/MedicalLibrary'));
export const SEODashboard = lazy(() => import('../components/SEODashboard'));
export const SupportDesk = lazy(() => import('../components/SupportDesk'));
export const ConsultNow = lazy(() => import('../domains/telemedicine/ConsultNow'));
export const PharmacyFinder = lazy(() => import('../components/PharmacyFinder'));
export const MedicalTourism = lazy(() => import('../components/MedicalTourism'));
export const TourismDesk = lazy(() => import('../components/TourismDesk'));
export const MedicalPackagesModule = lazy(() => import('../components/MedicalPackagesModule'));
export const MedicalAssistanceModule = lazy(() => import('../components/MedicalAssistanceModule'));
export const PatientHeroBanner = lazy(() => import('../components/PatientHeroBanner'));
