import React, { useState } from 'react';
import { useSchool } from '../../../context/SchoolContext';
import { Save, RotateCcw, Layout, Image, Sparkles } from '../../RealIcons';

export const AdminLandingPageTab: React.FC = () => {
  const { 
    aboutContent, 
    updateAboutContent, 
    resetAboutContent, 
    keyPillarsHeader, 
    updateKeyPillarsHeader,
    schoolInfo,
    updateSchoolInfo
  } = useSchool();

  const [aboutForm, setAboutForm] = useState(aboutContent);
  const [pillarHeaderForm, setPillarHeaderForm] = useState(keyPillarsHeader);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateAboutContent(aboutForm);
    updateKeyPillarsHeader(pillarHeaderForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Layout className="w-5 h-5 text-amber-600" />
            Website Content & Landing Page Management
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Customize the public school homepage texts, slogans, and institutional messaging.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetAboutContent}
            className="px-4 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          Landing page content successfully saved and synchronized with public view!
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* About Section Config */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
            About Section Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Badge Text</label>
              <input
                type="text"
                value={aboutForm.badge}
                onChange={e => setAboutForm({ ...aboutForm, badge: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Section Title</label>
              <input
                type="text"
                value={aboutForm.title}
                onChange={e => setAboutForm({ ...aboutForm, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">Institutional Description</label>
              <textarea
                rows={3}
                value={aboutForm.description}
                onChange={e => setAboutForm({ ...aboutForm, description: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Vision Statement</label>
              <textarea
                rows={2}
                value={aboutForm.vision}
                onChange={e => setAboutForm({ ...aboutForm, vision: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Mission Statement</label>
              <textarea
                rows={2}
                value={aboutForm.mission}
                onChange={e => setAboutForm({ ...aboutForm, mission: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Key Pillars Header */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
            Key Pillars Header
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Header Title</label>
              <input
                type="text"
                value={pillarHeaderForm.title}
                onChange={e => setPillarHeaderForm({ ...pillarHeaderForm, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Header Subtitle</label>
              <input
                type="text"
                value={pillarHeaderForm.subtitle}
                onChange={e => setPillarHeaderForm({ ...pillarHeaderForm, subtitle: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
          >
            <Save className="w-4 h-4" />
            Save Landing Page Content
          </button>
        </div>
      </form>
    </div>
  );
};
