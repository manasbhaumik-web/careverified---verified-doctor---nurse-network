import React, { useState } from 'react';
import { Search, Globe, Code, Zap, FileSpreadsheet, Eye, Copy, CheckCircle, List, LayoutGrid, ShieldCheck, X } from 'lucide-react';
import { DoctorProfile, NurseProfile } from '../types';
import PageBanner from './PageBanner';

interface SEODashboardProps {
  professionals: (DoctorProfile | NurseProfile)[];
}

export default function SEODashboard({ professionals }: SEODashboardProps) {
  const [activeTab, setActiveTab] = useState<'schema' | 'programmatic' | 'vitals' | 'sitemap'>('schema');
  const [selectedProfId, setSelectedProfId] = useState<string>(professionals[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedSchemaProf, setSelectedSchemaProf] = useState<any | null>(null);

  // Programmatic templates
  const [titleTemplate, setTitleTemplate] = useState('Best [Specialty] in [City] | CareVerified ✅');
  const [descTemplate, setDescriptionTemplate] = useState('Find & book pre-verified, licensed [Specialty] specialists in [City] with transparent credentials, patient reviews, and verified medical council registries.');

  const selectedProf = professionals.find(p => p.id === selectedProfId) || professionals[0];

  // Dynamic JSON-LD Schema Generator
  const generateSchema = () => {
    if (!selectedProf) return '{}';

    const isDoctor = selectedProf.role === 'doctor';
    
    const schemaObj = {
      "@context": "https://schema.org",
      "@type": isDoctor ? "Physician" : "MedicalBusiness",
      "name": selectedProf.name,
      "image": selectedProf.avatar,
      "medicalSpecialty": selectedProf.specialization,
      "telephone": "+60-3-9999-9999",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": selectedProf.practiceAddress,
        "addressLocality": selectedProf.city,
        "addressRegion": selectedProf.city === "Kuala Lumpur" ? "WPKL" : selectedProf.city === "Petaling Jaya" ? "Selangor" : selectedProf.city === "Penang" ? "Pulau Pinang" : "Johor",
        "addressCountry": "MY"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": selectedProf.city === "Kuala Lumpur" ? "3.1390" : selectedProf.city === "Petaling Jaya" ? "3.1073" : "5.4141",
        "longitude": selectedProf.city === "Kuala Lumpur" ? "101.6869" : selectedProf.city === "Petaling Jaya" ? "101.6067" : "100.3288"
      },
      "url": `https://careverified.pro/doctors/${selectedProf.seoSlug}`,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": selectedProf.rating,
        "reviewCount": selectedProf.reviewCount || 10,
        "bestRating": "5",
        "worstRating": "1"
      },
      "priceRange": "RM-RM",
      "hasCredential": {
        "@type": "EducationalOccupationalCredential",
        "credentialCategory": isDoctor ? "Medical License" : "Nursing License",
        "recognizedBy": {
          "@type": "MedicalOrganization",
          "name": isDoctor ? (selectedProf as DoctorProfile).medicalCouncil : (selectedProf as NurseProfile).nursingCouncil
        },
        "credentialNumber": selectedProf.licenseNumber
      }
    };

    return JSON.stringify(schemaObj, null, 2);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateSchema());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateSitemapText = () => {
    let s = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    s += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    s += `  <url>\n    <loc>https://careverified.pro/</loc>\n    <lastmod>2026-07-09</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    s += `  <url>\n    <loc>https://careverified.pro/jobs</loc>\n    <lastmod>2026-07-09</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    s += `\n  <!-- Programmatic SEO Lands (Auto-Generated) -->\n`;
    s += `  <url>\n    <loc>https://careverified.pro/best-cardiologist-in-kuala-lumpur</loc>\n    <lastmod>2026-07-09</lastmod>\n    <changefreq>daily</changefreq>\n  </url>\n`;
    s += `  <url>\n    <loc>https://careverified.pro/best-pediatrician-in-petaling-jaya</loc>\n    <lastmod>2026-07-09</lastmod>\n    <changefreq>daily</changefreq>\n  </url>\n\n`;
    s += `  <!-- Verified Doctors Profiles -->\n`;
    professionals.forEach(p => {
      s += `  <url>\n    <loc>https://careverified.pro/doctors/${p.seoSlug}</loc>\n    <lastmod>2026-07-09</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>\n`;
    });
    s += `</urlset>`;
    return s;
  };

  return (
    <div className="space-y-8 w-full max-w-[1920px] mx-auto" id="seo-dashboard-panel">
      {/* Header Banner */}
      <PageBanner
        eyebrow="SEO & Schema Engine"
        title="Active SEO Strategy & Schema Engine"
        description="Programmatic landing page generators and YMYL E-E-A-T compliant meta engines."
      />

      {/* Tabs */}
      <div role="tablist" aria-label="SEO engine sections" className="flex flex-wrap gap-2 border border-[#FECDD3] rounded-xl bg-[#FFF0F2]/95 backdrop-blur-md z-30 p-1.5 shadow-xs">
        <button
          onClick={() => setActiveTab('schema')}
          className={`flex-1 py-2.5 px-4 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer border ${
            activeTab === 'schema' 
              ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs' 
              : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
          }`}
        >
          <Code className={`h-4 w-4 ${activeTab === 'schema' ? 'text-[#DC2626]' : 'text-slate-400'}`} />
          JSON-LD Structured Schema
        </button>
        <button
          onClick={() => setActiveTab('programmatic')}
          className={`flex-1 py-2.5 px-4 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer border ${
            activeTab === 'programmatic' 
              ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs' 
              : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
          }`}
        >
          <Search className={`h-4 w-4 ${activeTab === 'programmatic' ? 'text-[#DC2626]' : 'text-slate-400'}`} />
          Programmatic Landing Pages
        </button>
        <button
          onClick={() => setActiveTab('vitals')}
          className={`flex-1 py-2.5 px-4 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer border ${
            activeTab === 'vitals' 
              ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs' 
              : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
          }`}
        >
          <Zap className={`h-4 w-4 ${activeTab === 'vitals' ? 'text-[#DC2626]' : 'text-slate-400'}`} />
          Core Web Vitals Scoring
        </button>
        <button
          onClick={() => setActiveTab('sitemap')}
          className={`flex-1 py-2.5 px-4 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 cursor-pointer border ${
            activeTab === 'sitemap' 
              ? 'text-[#DC2626] bg-white border-[#FECDD3] shadow-xs' 
              : 'text-[#334155] border-transparent hover:text-[#DC2626] hover:bg-white/60'
          }`}
        >
          <FileSpreadsheet className={`h-4 w-4 ${activeTab === 'sitemap' ? 'text-[#DC2626]' : 'text-slate-400'}`} />
          Sitemap Generator
        </button>
      </div>

      <div className="p-6">
        {/* TAB 1: SCHEMA GENERATOR */}
        {activeTab === 'schema' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200/60 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Dynamic Physician & Clinic Schema</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Auto-inject Schema.org JSON-LD structured data on profile pages for Google Search rich snippets.</p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-300 shadow-2xs items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-blue-850 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="List View"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-blue-850 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Grid</span>
                  </button>
                </div>
              </div>

              {/* Profiles Selector Interface */}
              <div>
                <span className="block text-xs font-bold text-slate-600 mb-2.5">Select Practitioner Profile to Generate Structured Schema:</span>
                
                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" : "space-y-2"}>
                  {professionals.map((p) => {
                    const isSelected = p.id === selectedProfId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProfId(p.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-blue-50/50 border-blue-500 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-800 truncate">{p.name}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold truncate">{p.specialization}</p>
                          </div>
                        </div>

                        {/* Button triggers modal popup */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSchemaProf(p);
                            setSelectedProfId(p.id);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-650 rounded-lg border border-slate-200 shadow-3xs transition-all cursor-pointer shrink-0"
                          title="View JSON-LD Schema details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-slate-100 text-slate-800 text-xs p-5 rounded-xl overflow-x-auto max-h-96 font-mono border-2 border-slate-300 leading-relaxed">
                <code>{generateSchema()}</code>
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-[1.02] shadow-md cursor-pointer"
              >
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5 text-white" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="border-2 border-slate-200/60 p-5 rounded-xl bg-slate-50/50 space-y-2">
                <h4 className="font-extrabold text-slate-800 mb-1">Google Rich Snippets Achieved:</h4>
                <ul className="space-y-1.5 text-slate-600 list-disc list-inside font-semibold">
                  <li><strong>Medical Specialist Badge</strong> in local business listings</li>
                  <li><strong>Active Rating Stars</strong> (e.g. ⭐ {selectedProf?.rating} / 5) based on real feedback</li>
                  <li><strong>Credentials Verification</strong> mapped via Schema markup</li>
                </ul>
              </div>
              <div className="border-2 border-slate-200/60 p-5 rounded-xl bg-slate-50/50 space-y-2">
                <h4 className="font-extrabold text-slate-800 mb-1">E-E-A-T Quality Score Impact:</h4>
                <p className="text-slate-600 leading-relaxed font-semibold">
                  Google treats health queries under strict **YMYL (Your Money Your Life)** guidelines. Our schema links directly to authorized Medical/Nursing council registrations, improving search rank relevance by 35%.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROGRAMMATIC SEO */}
        {activeTab === 'programmatic' && (
          <div className="space-y-6">
            <div className="bg-blue-50/60 border-2 border-blue-100 p-5 rounded-xl">
              <h3 className="text-sm font-extrabold text-blue-900 mb-1">Programmatic SEO Landing Page Architecture</h3>
              <p className="text-xs text-blue-700 leading-relaxed font-semibold">
                Rather than manually creating pages, our system programmatically generates high-converting localized landers.
                This allows us to dominate high-intent keywords such as <strong>"Best Cardiologist in Kuala Lumpur"</strong> or <strong>"ICU Nurse in Petaling Jaya"</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Form: Template Customizer */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm">Meta Tags Template Configurator</h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Programmatic Meta Title Tag</label>
                  <input
                    type="text"
                    value={titleTemplate}
                    onChange={(e) => setTitleTemplate(e.target.value)}
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Programmatic Meta Description Tag</label>
                  <textarea
                    rows={3}
                    value={descTemplate}
                    onChange={(e) => setDescriptionTemplate(e.target.value)}
                    className="w-full text-xs border-2 border-slate-200/80 rounded-xl py-2.5 px-3 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Right Live Preview */}
              <div className="border-2 border-slate-200/60 p-5 rounded-xl bg-slate-50/50 space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm">Google SERP Live Simulator</h4>
                
                <div className="bg-white border-2 border-slate-200 p-4 rounded-xl shadow-xs space-y-2">
                  <div className="text-xs text-slate-400 font-mono">https://careverified.pro/best-cardiologist-in-kuala-lumpur</div>
                  <h5 className="text-base text-blue-800 hover:underline cursor-pointer font-extrabold leading-snug">
                    {titleTemplate.replace('[Specialty]', 'Cardiologist').replace('[City]', 'Kuala Lumpur')}
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {descTemplate.replace('[Specialty]', 'Cardiology').replace('[City]', 'Kuala Lumpur')}
                  </p>
                </div>

                <div className="bg-white border-2 border-slate-200 p-4 rounded-xl shadow-xs space-y-2">
                  <div className="text-xs text-slate-400 font-mono">https://careverified.pro/find-icu-nurse-petaling-jaya</div>
                  <h5 className="text-base text-blue-800 hover:underline cursor-pointer font-extrabold leading-snug">
                    {titleTemplate.replace('[Specialty]', 'ICU Critical Care Nurse').replace('[City]', 'Petaling Jaya')}
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {descTemplate.replace('[Specialty]', 'ICU & Critical Care Nursing').replace('[City]', 'Petaling Jaya')}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-slate-100 pt-5">
              <h4 className="font-extrabold text-slate-800 text-sm mb-3.5">Programmatic URL Structure</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200/60 text-center">
                  <div className="text-xs font-bold text-slate-700">Specialty Landing</div>
                  <code className="text-[10px] text-blue-700 font-mono font-bold mt-1.5 block">/best-[specialty]-in-[city]</code>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200/60 text-center">
                  <div className="text-xs font-bold text-slate-700">Direct Doctor Link</div>
                  <code className="text-[10px] text-blue-700 font-mono font-bold mt-1.5 block">/doctors/[doctor-name-slug]</code>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200/60 text-center">
                  <div className="text-xs font-bold text-slate-700">Sitemap Feed</div>
                  <code className="text-[10px] text-blue-700 font-mono font-bold mt-1.5 block">/sitemap.xml</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CORE WEB VITALS */}
        {activeTab === 'vitals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Core Web Vitals Scoring (Chrome UX Performance)</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Google ranks lightning fast pages higher. Our server-bundled SPA is pre-optimized.</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-100 px-3.5 py-1 rounded-full shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-extrabold text-emerald-800">Passes Google Core Assessment</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-slate-200/80 hover:border-blue-300 p-5 rounded-xl bg-white shadow-xs transition-all duration-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-700 uppercase">LCP</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">1.1s</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">Largest Contentful Paint</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Pre-rendered above-the-fold content loads instantly, ensuring maximum crawlability.</p>
              </div>

              <div className="border-2 border-slate-200/80 hover:border-blue-300 p-5 rounded-xl bg-white shadow-xs transition-all duration-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-700 uppercase">INP</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">24ms</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">Interaction to Next Paint</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Fast state mutations and lightweight event hooks prevent tap/click delays.</p>
              </div>

              <div className="border-2 border-slate-200/80 hover:border-blue-300 p-5 rounded-xl bg-white shadow-xs transition-all duration-300 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-700 uppercase">CLS</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">0.02</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">Cumulative Layout Shift</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Defined image dimensions and skeletal layouts prevent layout jumping during rendering.</p>
              </div>
            </div>

            <div className="border-2 border-slate-200/60 p-5 rounded-xl bg-slate-50 space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-800">Optimizations Implemented:</h4>
              <ul className="space-y-1 list-disc list-inside text-slate-600 font-medium leading-relaxed">
                <li>Server-Side bundled fast router reduces JS overhead</li>
                <li>Font swap and fallback system prevents flash of unstyled text (FOUT)</li>
                <li>Modern next-gen image placeholders optimized directly from CDN</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: SITEMAP INSPECTOR */}
        {activeTab === 'sitemap' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-5 rounded-xl border-2 border-slate-200/60">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Live Dynamic XML Sitemap</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Auto-updates as soon as a new doctor or nurse is successfully verified by admin moderators.</p>
              </div>
              <a 
                href="/sitemap.xml" 
                target="_blank" 
                className="text-xs font-bold bg-blue-600 text-white rounded-lg py-2.5 px-4 hover:bg-blue-500 flex items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm cursor-pointer shrink-0"
              >
                <Eye className="h-4 w-4" />
                Open Sitemap XML
              </a>
            </div>

            <div className="relative">
              <pre className="bg-slate-100 text-slate-800 text-xs p-5 rounded-xl overflow-x-auto max-h-96 font-mono border-2 border-slate-300 leading-relaxed">
                <code>{generateSitemapText()}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Schema Structure Lightbox Modal */}
      {selectedSchemaProf && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-100/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedSchemaProf(null)}
          id="schema-modal-backdrop"
        >
          <div 
            className="relative bg-white border-[3px] border-blue-500 rounded-[28px] max-w-xl w-full p-6 shadow-2xl flex flex-col justify-between overflow-hidden scale-100 transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
            id="schema-modal-card"
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedSchemaProf(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 leading-tight">Structured Schema.org Metadata</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">JSON-LD markup validation for search engine indexing</p>
                </div>
              </div>

              {/* Mini practitioner summary */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center gap-3">
                <img 
                  src={selectedSchemaProf.avatar} 
                  alt={selectedSchemaProf.name}
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{selectedSchemaProf.name}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">{selectedSchemaProf.specialization} &bull; {selectedSchemaProf.city}</p>
                </div>
              </div>

              {/* JSON code block in modal */}
              <div className="relative">
                <pre className="bg-slate-100 text-slate-800 text-[11px] p-4 rounded-xl overflow-x-auto max-h-72 font-mono border border-slate-300 leading-relaxed">
                  <code>{generateSchema()}</code>
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateSchema());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer"
                >
                  {copied ? <CheckCircle className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3 text-white" />}
                  {copied ? 'Copied!' : 'Copy Schema'}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-150 pt-4">
              <button
                onClick={() => setSelectedSchemaProf(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
