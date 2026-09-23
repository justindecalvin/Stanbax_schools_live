import React, { useState, useEffect } from 'react';
import { useSchool } from '../../../context/SchoolContext';
import { generateLocalCurriculumAssessment } from '../../../utils/curriculumEngine';
import { 
  Sparkles, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Send, 
  RotateCcw, 
  Award, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  HelpCircle, 
  Sliders, 
  Layers, 
  GraduationCap, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  EyeOff,
  Palette,
  ExternalLink,
  ChevronDown
} from '../../RealIcons';

interface ObjectiveItem {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD?: string;
  correctOption: string;
  singleLineFormat: string;
  pictorialSymbol?: string;
  visualHint?: string;
}

interface TheoryItem {
  id: number;
  questionNumber: number;
  questionText: string;
  subParts?: string[];
  maxScore: number;
  sampleAnswer?: string;
}

interface GeneratedAssessment {
  id: string;
  timestamp: string;
  title: string;
  schoolName: string;
  classLevel: string;
  subject: string;
  term: string;
  assessmentType: string;
  timeAllowed: string;
  instructions: string;
  isEarlyYearsPictorial: boolean;
  isSecondaryFiftySix: boolean;
  objectives: ObjectiveItem[];
  theory: TheoryItem[];
  paperSavingText: string;
  markingGuide: string;
}

export const AiExamCreatorTab: React.FC = () => {
  const { 
    tutor, 
    schoolInfo, 
    assessmentConfig, 
    classes, 
    subjects, 
    addHomework 
  } = useSchool();

  // Class Selection with Age-Grouping & Pre-configurations
  const [selectedClass, setSelectedClass] = useState<string>('SSS 2');
  const [selectedSubject, setSelectedSubject] = useState<string>(
    tutor.assignedSubjects?.[0] || 'Biology'
  );
  const [selectedTerm, setSelectedTerm] = useState<'1st Term' | '2nd Term' | '3rd Term'>(
    (assessmentConfig.activeTerm as any) || '2nd Term'
  );
  const [assessmentType, setAssessmentType] = useState<string>('Terminal Examination');
  const [customTopics, setCustomTopics] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('Standard WAEC / BECE Standard');

  // Question counts
  const [objCount, setObjCount] = useState<number>(50);
  const [theoryCount, setTheoryCount] = useState<number>(6);
  const [singleLinePaperSaver, setSingleLinePaperSaver] = useState<boolean>(true);

  // Generation status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Assessment results state
  const [currentAssessment, setCurrentAssessment] = useState<GeneratedAssessment | null>(null);
  const [activeView, setActiveView] = useState<'paper_saving' | 'cards' | 'marking_guide' | 'saved_vault'>('paper_saving');
  const [showMarkingGuide, setShowMarkingGuide] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Saved assessments archive in localStorage
  const [savedVault, setSavedVault] = useState<GeneratedAssessment[]>(() => {
    try {
      const saved = localStorage.getItem('stanbax_tutor_exams_vault');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Automatically adapt parameters when class changes
  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    const isEarly = 
      newClass.includes('Nursery') || 
      newClass.includes('Kindergarten') || 
      newClass.includes('KG') || 
      newClass.includes('Reception') || 
      newClass.includes('Creche');

    const isSec = 
      newClass.includes('JSS') || 
      newClass.includes('SSS') || 
      newClass.includes('Secondary');

    if (isEarly) {
      setObjCount(15);
      setTheoryCount(0);
      if (!selectedSubject.includes('Phonics') && !selectedSubject.includes('Number Work')) {
        setSelectedSubject('Number Work & Shapes');
      }
    } else if (isSec) {
      setObjCount(50);
      setTheoryCount(6);
      if (selectedSubject.includes('Number Work') || selectedSubject.includes('Phonics')) {
        setSelectedSubject('Mathematics');
      }
    } else {
      // Primary
      setObjCount(30);
      setTheoryCount(4);
    }
  };

  const isEarlyYears = 
    selectedClass.includes('Nursery') || 
    selectedClass.includes('Kindergarten') || 
    selectedClass.includes('KG') || 
    selectedClass.includes('Reception') || 
    selectedClass.includes('Creche');

  const isSecondary = 
    selectedClass.includes('JSS') || 
    selectedClass.includes('SSS') || 
    selectedClass.includes('Secondary');

  // Handle Assessment Generation
  const handleGenerateAssessment = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    setGenerationStep('Connecting to Stanbax Academic AI engine...');

    try {
      setTimeout(() => setGenerationStep('Personalizing syllabus for ' + selectedClass + ' (' + selectedTerm + ')...'), 600);
      if (isEarlyYears) {
        setTimeout(() => setGenerationStep('Formulating pictorial visual representations for early childhood identification...'), 1200);
      } else if (isSecondary) {
        setTimeout(() => setGenerationStep('Synthesizing 50 objective questions and 6 theory questions under WAEC/BECE syllabus...'), 1200);
      }
      setTimeout(() => setGenerationStep('Formatting options into strict single-line paper-saving layout...'), 1800);

      let assessmentData = null;
      let sourceName = 'server_ai';

      try {
        const response = await fetch('/api/generate-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classLevel: selectedClass,
            ageGroup: isEarlyYears ? 'Ages 3-6' : isSecondary ? 'Secondary School' : 'Primary School',
            subject: selectedSubject,
            term: selectedTerm,
            assessmentType,
            curriculumTopics: customTopics,
            difficulty,
            targetObjectiveCount: objCount,
            targetTheoryCount: theoryCount
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            assessmentData = result.data;
            sourceName = result.source || 'ai';
          }
        }
      } catch (fetchErr) {
        console.info('Backend endpoint not reachable (static/free host mode). Using built-in curriculum engine.');
      }

      // If server was not reachable or returned error (e.g. GitHub Pages static or Vercel static), use built-in curriculum engine
      if (!assessmentData) {
        sourceName = 'offline_curriculum_engine';
        assessmentData = generateLocalCurriculumAssessment({
          classLevel: selectedClass,
          ageGroup: isEarlyYears ? 'Ages 3-6' : isSecondary ? 'Secondary School' : 'Primary School',
          subject: selectedSubject,
          term: selectedTerm,
          assessmentType,
          curriculumTopics: customTopics,
          difficulty,
          targetObjectiveCount: objCount,
          targetTheoryCount: theoryCount
        });
      }

      const assessment: GeneratedAssessment = {
        ...assessmentData,
        id: 'EXAM_' + Date.now(),
        timestamp: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      setCurrentAssessment(assessment);
      setActiveView('paper_saving');
      setSuccessMsg(
        sourceName === 'offline_curriculum_engine'
          ? `Successfully synthesized ${assessment.objectives.length} objective questions ${assessment.theory.length > 0 ? `and ${assessment.theory.length} theory questions` : ''} via Built-in Academic Engine!`
          : `Successfully synthesized ${assessment.objectives.length} objective questions ${assessment.theory.length > 0 ? `and ${assessment.theory.length} theory questions` : ''}!`
      );
      
      // Auto-save to vault
      const updatedVault = [assessment, ...savedVault.slice(0, 19)];
      setSavedVault(updatedVault);
      try {
        localStorage.setItem('stanbax_tutor_exams_vault', JSON.stringify(updatedVault));
      } catch (e) {
        console.warn('Storage save failed', e);
      }
    } catch (err: any) {
      console.warn('Generation error:', err);
      setErrorMsg('Assessment generation failed: ' + (err.message || 'Please retry.'));
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Copy Paper-Saving Text to Clipboard
  const handleCopyPaperSavingText = () => {
    if (!currentAssessment) return;
    navigator.clipboard.writeText(currentAssessment.paperSavingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Publish Directly to Student Homework / Assignment
  const handlePublishToHomework = () => {
    if (!currentAssessment) return;
    addHomework({
      title: `${currentAssessment.subject} ${currentAssessment.assessmentType} (${currentAssessment.classLevel})`,
      subject: currentAssessment.subject,
      assignedBy: tutor.name,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      instructions: `Complete the ${currentAssessment.objectives.length} objective questions and Section B theory tasks. Refer to instructions on duration (${currentAssessment.timeAllowed}).`
    });
    setSuccessMsg(`Published successfully as a class assignment for ${currentAssessment.classLevel}! Students can now view this in their portal.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Print Paper-Saving Exam View
  const handlePrintPaperSavingExam = () => {
    if (!currentAssessment) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate the printable exam paper.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${currentAssessment.schoolName} - ${currentAssessment.subject} - ${currentAssessment.classLevel}</title>
  <style>
    @page { size: A4; margin: 12mm 10mm 12mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 10pt; line-height: 1.35; color: #000000; background: #ffffff; margin: 0; padding: 10px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
    .header h1 { font-size: 16pt; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { font-size: 11pt; font-weight: bold; margin: 2px 0; text-transform: uppercase; }
    .header p { font-size: 9pt; margin: 1px 0; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9pt; }
    .meta-table td { padding: 3px 4px; border: 1px solid #333; }
    .section-banner { background: #f0f0f0; border: 1px solid #000; padding: 4px 6px; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; margin: 8px 0 6px 0; }
    
    /* Strict paper-saving layout: options on same line */
    .obj-list { margin: 0; padding: 0; list-style: none; }
    .obj-item { margin-bottom: 4px; page-break-inside: avoid; }
    .obj-num { font-weight: bold; margin-right: 4px; }
    .obj-text { font-weight: 500; }
    .obj-opts { display: inline; margin-left: 6px; font-weight: normal; }
    .opt-token { display: inline-block; margin-right: 10px; }
    .opt-token strong { font-weight: bold; }
    
    .pictorial-card { display: inline-block; font-size: 14pt; vertical-align: middle; margin-right: 4px; }
    
    .theory-item { margin-bottom: 8px; page-break-inside: avoid; border-top: 1px dashed #ccc; padding-top: 4px; }
    .theory-title { font-weight: bold; font-size: 10pt; }
    .theory-text { white-space: pre-line; margin-top: 2px; }
    
    .footer { margin-top: 15px; border-top: 1px solid #666; font-size: 8pt; text-align: center; padding-top: 4px; }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${currentAssessment.schoolName}</h1>
    <h2>${currentAssessment.term.toUpperCase()} EXAMINATION • 2025/2026 ACADEMIC SESSION</h2>
    <p>GOVERNMENT APPROVED • ACCREDITED BRITISH-NIGERIAN BASIC & SENIOR SECONDARY CURRICULUM</p>
  </div>

  <table class="meta-table">
    <tr>
      <td><strong>SUBJECT:</strong> ${currentAssessment.subject.toUpperCase()}</td>
      <td><strong>CLASS:</strong> ${currentAssessment.classLevel.toUpperCase()}</td>
      <td><strong>TIME ALLOWED:</strong> ${currentAssessment.timeAllowed.toUpperCase()}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>CANDIDATE NAME:</strong> __________________________________________________</td>
      <td><strong>EXAM NO:</strong> ______________</td>
    </tr>
  </table>

  <div class="section-banner">
    ${currentAssessment.isEarlyYearsPictorial 
      ? 'SECTION A: PICTORIAL RECOGNITION & IDENTIFICATION (Answer All Questions)' 
      : currentAssessment.isSecondaryFiftySix 
      ? 'SECTION A: OBJECTIVE MULTIPLE CHOICE (50 MARKS) — Answer All 50 Questions (Options On Same Line)' 
      : 'SECTION A: OBJECTIVE QUESTIONS'}
  </div>

  <div class="obj-list">
    ${currentAssessment.objectives.map((o) => `
      <div class="obj-item">
        <span class="obj-num">${o.id}.</span>
        ${o.pictorialSymbol ? `<span class="pictorial-card">${o.pictorialSymbol}</span>` : ''}
        <span class="obj-text">${o.question.replace(/^\[.*?\]\s*/, '')}</span>
        <div class="obj-opts">
          <span class="opt-token"><strong>(A)</strong> ${o.optionA}</span>
          <span class="opt-token"><strong>(B)</strong> ${o.optionB}</span>
          <span class="opt-token"><strong>(C)</strong> ${o.optionC}</span>
          ${o.optionD ? `<span class="opt-token"><strong>(D)</strong> ${o.optionD}</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>

  ${currentAssessment.theory.length > 0 ? `
    <div class="section-banner" style="margin-top: 14px;">
      ${currentAssessment.isSecondaryFiftySix 
        ? 'SECTION B: THEORY & STRUCTURED ESSAY (50 MARKS) — Answer Any FOUR (4) Questions Out Of Six' 
        : 'SECTION B: THEORY & STRUCTURED ESSAY'}
    </div>
    <div style="margin-top: 6px;">
      ${currentAssessment.theory.map(t => `
        <div class="theory-item">
          <div class="theory-title">QUESTION ${t.questionNumber} (${t.maxScore} Marks)</div>
          <div class="theory-text">${t.questionText}</div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="footer">
    Examination Paper prepared via Stanbax AI Academic System • Designed for Paper-Saving Eco-Friendly Printing.
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 text-white p-6 sm:p-7 shadow-lg border border-purple-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Personalized AI Exam Synthesizer</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold text-xs">
                Paper-Saving Single-Line Layout
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold text-xs">
                Ages 3-6 Pictorial + Secondary 50/6 Compliant
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              AI Academic Assessment & Examination Studio
            </h2>
            
            <p className="text-xs sm:text-sm text-purple-200 max-w-3xl leading-relaxed">
              Generate curriculum-tailored tests and terminal examination papers in seconds. Early years pupils (ages 3–6) automatically receive <strong>pictorial representations</strong> for visual identification; secondary classes receive the standard <strong>50 objective questions + 6 theory questions</strong>, with all options lined up on the same line to save paper and photocopying costs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveView('saved_vault')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border shadow-sm ${
                activeView === 'saved_vault'
                  ? 'bg-amber-400 text-blue-950 border-amber-300'
                  : 'bg-blue-900/60 hover:bg-blue-900 text-purple-200 border-purple-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Exam Vault ({savedVault.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-900 font-bold">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold">Dismiss</button>
        </div>
      )}

      {/* Control Panel: Parameters for Personalized Generation */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">Configure Exam Personalization</h3>
              <p className="text-[11px] text-slate-500">Adapts difficulty, questions count, and pictorial mode automatically</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isEarlyYears && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black flex items-center gap-1">
                <span>🎨 Early Years: Pictorial Mode</span>
              </span>
            )}
            {isSecondary && (
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-black flex items-center gap-1">
                <span>⚡ Secondary: 50 Obj + 6 Theory</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* 1. Class / Educational Level */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Target Class / Level</span>
              <span className="text-[10px] text-purple-700 font-extrabold">Age-Adaptive</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            >
              <optgroup label="🧸 Early Years (Ages 3–6 • Pictorial Mode)">
                <option value="Creche / Pre-Nursery (Age 2-3)">Creche / Pre-Nursery (Age 2–3)</option>
                <option value="Nursery 1 (Age 3-4)">Nursery 1 (Age 3–4)</option>
                <option value="Nursery 2 (Age 4-5)">Nursery 2 (Age 4–5)</option>
                <option value="Kindergarten / Reception (Age 5-6)">Kindergarten / Reception (Age 5–6)</option>
              </optgroup>
              <optgroup label="🎒 Primary School (Basic 1–6)">
                <option value="Primary 1 (Basic 1)">Primary 1 (Basic 1)</option>
                <option value="Primary 2 (Basic 2)">Primary 2 (Basic 2)</option>
                <option value="Primary 3 (Basic 3)">Primary 3 (Basic 3)</option>
                <option value="Primary 4 (Basic 4)">Primary 4 (Basic 4)</option>
                <option value="Primary 5 (Basic 5)">Primary 5 (Basic 5)</option>
                <option value="Primary 6 (Basic 6)">Primary 6 (Basic 6)</option>
              </optgroup>
              <optgroup label="🎓 Junior Secondary (50 Obj + 6 Theory)">
                <option value="JSS 1">JSS 1</option>
                <option value="JSS 2">JSS 2</option>
                <option value="JSS 3">JSS 3</option>
              </optgroup>
              <optgroup label="🏛️ Senior Secondary (50 Obj + 6 Theory)">
                <option value="SSS 1">SSS 1</option>
                <option value="SSS 2">SSS 2</option>
                <option value="SSS 3">SSS 3</option>
              </optgroup>
            </select>
          </div>

          {/* 2. Subject */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Curriculum Subject</span>
              {tutor.assignedSubjects && tutor.assignedSubjects.length > 0 && (
                <span className="text-[10px] text-emerald-700 font-extrabold">Assigned</span>
              )}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            >
              {isEarlyYears ? (
                <>
                  <option value="Number Work & Shapes">Number Work & Counting (Shapes & Numbers)</option>
                  <option value="Phonics & Letter Sounds">Phonics & Letter Recognition (A-Z)</option>
                  <option value="Basic Science & Nature">Basic Science & Nature (Animals & Plants)</option>
                  <option value="Social Habits & Everyday Objects">Social Habits & Everyday Objects</option>
                  <option value="Health Habits & Hygiene">Health Habits & Personal Hygiene</option>
                  <option value="Rhymes & Coloring">Rhymes, Coloring & Visual Puzzles</option>
                </>
              ) : (
                <>
                  {tutor.assignedSubjects?.map((s) => (
                    <option key={s} value={s}>★ {s} (Your Subject)</option>
                  ))}
                  <option value="Mathematics">Mathematics</option>
                  <option value="English Language">English Language</option>
                  <option value="Basic Science & Technology">Basic Science & Technology</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="Agricultural Science">Agricultural Science</option>
                  <option value="Civic Education">Civic Education</option>
                  <option value="Computer Studies / ICT">Computer Studies / ICT</option>
                  <option value="Economics">Economics</option>
                  <option value="Government">Government</option>
                  <option value="Literature in English">Literature in English</option>
                  <option value="Social Studies">Social Studies</option>
                  <option value="Business Studies">Business Studies</option>
                </>
              )}
            </select>
          </div>

          {/* 3. Academic Term */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Academic Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            >
              <option value="1st Term">1st Term (Advent / Harmattan Term)</option>
              <option value="2nd Term">2nd Term (Lent / Easter Term)</option>
              <option value="3rd Term">3rd Term (Trinity / Promotional Term)</option>
            </select>
          </div>

          {/* 4. Assessment Type */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Assessment Type</label>
            <select
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            >
              <option value="Terminal Examination">Terminal Examination (Comprehensive)</option>
              <option value="Mid-Term CA Test">Mid-Term CA Test (Continuous Assessment)</option>
              <option value="Weekly Class Quiz">Weekly Class Quiz</option>
              <option value="Take-Home Project Assignment">Take-Home Project Assignment</option>
            </select>
          </div>
        </div>

        {/* Second Row: Specific Topics, Formatting Toggles & Question Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
          {/* Specific Syllabus Topics */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Specific Topics / Curriculum Scope (Optional)</span>
              <span className="text-slate-400 font-normal">Leave blank for full term syllabus</span>
            </label>
            <input
              type="text"
              value={customTopics}
              onChange={(e) => setCustomTopics(e.target.value)}
              placeholder={isEarlyYears ? "e.g. Identification of domestic animals, counting objects 1-10, primary colors" : "e.g. Photosynthesis, Cell Division, Genetics and Evolution"}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>

          {/* Paper-Saving Toggle */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-black text-purple-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Paper-Saver Layout</span>
              </div>
              <p className="text-[11px] text-purple-900 mt-0.5">
                Puts questions & options on the exact same line to cut printing costs.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={singleLinePaperSaver}
                onChange={(e) => setSingleLinePaperSaver(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
            </label>
          </div>
        </div>

        {/* Detailed Question Count Controls */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-slate-500 block font-bold">Objective Questions:</span>
              <span className="font-black text-slate-900 text-sm">
                {objCount} Questions
              </span>
              {isSecondary && (
                <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                  50 Standard
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-500 block font-bold">Theory Questions:</span>
              <span className="font-black text-slate-900 text-sm">
                {theoryCount} Questions
              </span>
              {isSecondary && (
                <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                  6 Questions (Answer 4)
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-500 block font-bold">Special Formatting:</span>
              <span className="font-black text-purple-900 text-xs">
                {isEarlyYears ? '🖼️ Visual Symbols & Emojis' : '📄 Single-Line Compact Options'}
              </span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleGenerateAssessment}
            disabled={isGenerating}
            id="generate-ai-exam-btn"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-700 hover:from-purple-800 hover:to-blue-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isGenerating ? 'Generating Exam...' : 'Generate Exam Paper with AI'}</span>
          </button>
        </div>

        {/* Loading Progress State */}
        {isGenerating && (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
            <div className="flex items-center justify-between text-xs text-purple-900 font-bold">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                <span>{generationStep}</span>
              </span>
              <span>AI Synthesizer Active</span>
            </div>
            <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}
      </div>

      {/* Generated Assessment Workspace */}
      {currentAssessment && (
        <div className="space-y-4">
          {/* Workspace Sub-Navigation & Quick Actions */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* View switcher */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveView('paper_saving')}
                className={`px-3.5 py-2 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'paper_saving'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Paper-Saving Master Sheet</span>
              </button>

              <button
                onClick={() => setActiveView('cards')}
                className={`px-3.5 py-2 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'cards'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Interactive Question Cards ({currentAssessment.objectives.length})</span>
              </button>

              <button
                onClick={() => setActiveView('marking_guide')}
                className={`px-3.5 py-2 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'marking_guide'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Marking Guide & Answers</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrintPaperSavingExam}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Print ready for classroom photocopying"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Exam Paper</span>
              </button>

              <button
                onClick={handleCopyPaperSavingText}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Copy all questions on same line for Word or Docs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-purple-700" />}
                <span>{copied ? 'Copied!' : 'Copy Single-Line Text'}</span>
              </button>

              <button
                onClick={handlePublishToHomework}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Publish directly as homework to Student Portal"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post as Student Homework</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: PAPER-SAVING MASTER SHEET */}
          {activeView === 'paper_saving' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 font-['Nunito',sans-serif]">
              {/* Paper-saving indicator banner */}
              <div className="mb-6 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Paper-Saving Layout Activated:</strong> Questions and options are placed on the exact same line. This cuts paper usage by ~50-60% when printing or photocopying for school examinations.
                  </span>
                </div>
                <button
                  onClick={handlePrintPaperSavingExam}
                  className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-blue-950 font-black cursor-pointer shrink-0"
                >
                  Print / Save PDF
                </button>
              </div>

              {/* Official Examination Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-950 text-amber-400 flex items-center justify-center font-black text-sm">
                    SB
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950">
                    {currentAssessment.schoolName}
                  </h1>
                </div>
                <h2 className="text-xs sm:text-sm font-black text-blue-900 uppercase">
                  {currentAssessment.term} Examination • 2025/2026 Academic Session
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Accredited British-Nigerian Basic & Senior Secondary Curriculum • Ibadan, Oyo State
                </p>

                {/* Candidate meta grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-[11px] text-left">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Subject</span>
                    <span className="font-black text-slate-900">{currentAssessment.subject}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Class</span>
                    <span className="font-black text-slate-900">{currentAssessment.classLevel}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Time Allowed</span>
                    <span className="font-black text-slate-900">{currentAssessment.timeAllowed}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase">Total Marks</span>
                    <span className="font-black text-slate-900">
                      {currentAssessment.objectives.length + (currentAssessment.theory.length > 0 ? 50 : 0)} Marks
                    </span>
                  </div>
                </div>

                <div className="mt-3 p-2 rounded-lg border border-dashed border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
                  <div className="w-full sm:w-auto">
                    <strong>Candidate Name:</strong> ____________________________________________________
                  </div>
                  <div>
                    <strong>Exam No:</strong> ______________
                  </div>
                  <div>
                    <strong>Date:</strong> ______________
                  </div>
                </div>
              </div>

              {/* Section A: Objective Questions */}
              <div className="space-y-4">
                <div className="p-2.5 rounded-xl bg-blue-900 text-white font-black text-xs uppercase tracking-wide flex items-center justify-between">
                  <span>
                    {currentAssessment.isEarlyYearsPictorial
                      ? `SECTION A: PICTORIAL RECOGNITION (${currentAssessment.objectives.length} Marks) — Answer All`
                      : currentAssessment.isSecondaryFiftySix
                      ? `SECTION A: OBJECTIVE QUESTIONS (50 MARKS) — All Questions & Options On Same Line`
                      : `SECTION A: OBJECTIVE QUESTIONS (${currentAssessment.objectives.length} Marks)`}
                  </span>
                  <span className="text-amber-300 font-bold">1 Mark Each</span>
                </div>

                <div className="text-xs text-slate-600 italic">
                  {currentAssessment.instructions}
                </div>

                {/* Question List: Paper-Saving Single Line Display */}
                <div className="divide-y divide-slate-100 space-y-2 text-xs">
                  {currentAssessment.objectives.map((item) => (
                    <div 
                      key={item.id} 
                      className="pt-2 pb-1 hover:bg-slate-50 px-2 rounded-lg transition-colors flex flex-col sm:flex-row sm:items-baseline justify-between gap-x-3 gap-y-1"
                    >
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-black text-blue-950 shrink-0 w-6">
                          {item.id}.
                        </span>
                        
                        {/* Pictorial symbol for young pupils */}
                        {item.pictorialSymbol && (
                          <span className="text-base sm:text-lg shrink-0 px-1 py-0.5 rounded bg-amber-50 border border-amber-200">
                            {item.pictorialSymbol}
                          </span>
                        )}

                        <span className="font-semibold text-slate-900">
                          {item.question.replace(/^\[.*?\]\s*/, '')}
                        </span>
                      </div>

                      {/* Options strictly on the same line */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:shrink-0 text-slate-800 pl-7 sm:pl-0 font-medium">
                        <span className="whitespace-nowrap">
                          <strong className="text-blue-900 mr-1">(A)</strong> {item.optionA}
                        </span>
                        <span className="whitespace-nowrap">
                          <strong className="text-blue-900 mr-1">(B)</strong> {item.optionB}
                        </span>
                        <span className="whitespace-nowrap">
                          <strong className="text-blue-900 mr-1">(C)</strong> {item.optionC}
                        </span>
                        {item.optionD && (
                          <span className="whitespace-nowrap">
                            <strong className="text-blue-900 mr-1">(D)</strong> {item.optionD}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section B: Theory Questions (6 Questions for Secondary) */}
              {currentAssessment.theory.length > 0 && (
                <div className="mt-8 space-y-4 pt-4 border-t-2 border-slate-900">
                  <div className="p-2.5 rounded-xl bg-purple-950 text-white font-black text-xs uppercase tracking-wide flex items-center justify-between">
                    <span>
                      {currentAssessment.isSecondaryFiftySix
                        ? `SECTION B: THEORY & ESSAY (50 MARKS) — Answer Any Four (4) Questions Out Of Six`
                        : `SECTION B: THEORY & STRUCTURED QUESTIONS`}
                    </span>
                    <span className="text-amber-300 font-bold">Comprehensive Rubric</span>
                  </div>

                  <div className="text-xs text-slate-600 italic">
                    {currentAssessment.isSecondaryFiftySix 
                      ? "Instructions: Answer any FOUR (4) questions from this section. All questions carry equal marks. Write legibly in blue or black ink."
                      : "Instructions: Answer all questions in the spaces provided."}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {currentAssessment.theory.map((t) => (
                      <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="font-black text-blue-950">
                            QUESTION {t.questionNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-black text-[10px]">
                            {t.maxScore} Marks
                          </span>
                        </div>
                        <div className="whitespace-pre-line text-slate-800 leading-relaxed font-medium">
                          {t.questionText}
                        </div>
                        {t.subParts && t.subParts.length > 0 && (
                          <div className="pt-2 border-t border-dashed border-slate-200 flex flex-wrap gap-1.5">
                            {t.subParts.map((sp, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                                {sp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: INTERACTIVE QUESTION CARDS (Great for Ages 3-6 or reviewing individual items) */}
          {activeView === 'cards' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentAssessment.objectives.map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-950 font-black text-xs flex items-center justify-center">
                          {item.id}
                        </span>
                        <span className="text-xs font-bold text-slate-600">Objective Question</span>
                      </div>
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Answer: ({item.correctOption})
                      </span>
                    </div>

                    {/* For early childhood: Large pictorial card */}
                    {item.pictorialSymbol && (
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-center flex flex-col items-center justify-center">
                        <span className="text-4xl my-1">{item.pictorialSymbol}</span>
                        {item.visualHint && (
                          <span className="text-[11px] font-bold text-amber-900 mt-1">
                            Visual Clue: {item.visualHint}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {item.question.replace(/^\[.*?\]\s*/, '')}
                    </p>

                    {/* Options list */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2.5 rounded-xl border font-semibold ${item.correctOption === 'A' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                        <strong>(A)</strong> {item.optionA}
                      </div>
                      <div className={`p-2.5 rounded-xl border font-semibold ${item.correctOption === 'B' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                        <strong>(B)</strong> {item.optionB}
                      </div>
                      <div className={`p-2.5 rounded-xl border font-semibold ${item.correctOption === 'C' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                        <strong>(C)</strong> {item.optionC}
                      </div>
                      {item.optionD && (
                        <div className={`p-2.5 rounded-xl border font-semibold ${item.correctOption === 'D' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                          <strong>(D)</strong> {item.optionD}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: MARKING GUIDE & ANSWER KEYS */}
          {activeView === 'marking_guide' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 text-xs font-['Nunito',sans-serif]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-950 flex items-center justify-center font-black">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">
                      Official Confidential Marking Scheme
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {currentAssessment.subject} • {currentAssessment.classLevel} • {currentAssessment.term}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px] uppercase tracking-wider">
                  Faculty Confidential
                </span>
              </div>

              {/* Quick Objective Key Matrix */}
              <div>
                <h4 className="font-black text-slate-900 mb-2 uppercase text-[11px] text-blue-900">
                  Section A: Rapid Objective Keys (1 to {currentAssessment.objectives.length})
                </h4>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 font-mono text-center">
                  {currentAssessment.objectives.map((o) => (
                    <div key={o.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-sans">Q{o.id}</span>
                      <span className="font-black text-sm text-blue-950">{o.correctOption}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theory Model Answers */}
              {currentAssessment.theory.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] text-purple-900">
                    Section B: Theory Grading Rubrics & Model Criteria
                  </h4>
                  <div className="space-y-3">
                    {currentAssessment.theory.map((t) => (
                      <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-blue-950">QUESTION {t.questionNumber} (Max: {t.maxScore} Marks)</span>
                          <span className="text-[10px] font-bold text-slate-500">Criteria Reference</span>
                        </div>
                        <p className="text-slate-800 font-semibold">{t.questionText}</p>
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
                          <span className="font-black text-[10px] uppercase text-emerald-800 block">Expected Model Answer / Grading Rubric:</span>
                          <p className="italic">{t.sampleAnswer || 'Full marks awarded for standard definition, correct diagrams, and verified examples.'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: SAVED EXAM VAULT */}
          {activeView === 'saved_vault' && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  <span>Saved Examination Papers Vault ({savedVault.length})</span>
                </h3>
                <span className="text-slate-400">Stored locally in your faculty portal</span>
              </div>

              {savedVault.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold">No saved examination papers yet</p>
                  <p className="text-[11px]">Generate your first assessment paper above to automatically archive it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedVault.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-300 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-blue-950 text-sm">{item.subject}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                          {item.classLevel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2">
                        <span>{item.term}</span>
                        <span>•</span>
                        <span>{item.assessmentType}</span>
                        <span>•</span>
                        <span>{item.objectives.length} Obj Qs</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCurrentAssessment(item);
                              setActiveView('paper_saving');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold cursor-pointer text-[10px]"
                          >
                            Load Exam
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
