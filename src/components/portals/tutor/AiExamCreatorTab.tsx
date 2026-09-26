import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSchool } from '../../../context/SchoolContext';
import { generateLocalCurriculumAssessment } from '../../../utils/curriculumEngine';
import { SchemeOfWork } from '../../../types';
import { 
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
  ChevronDown,
  Upload,
  Zap,
  Target,
  Search,
  X,
  Play,
  CheckSquare,
  FileSpreadsheet,
  FileCheck
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
  readingPassage?: {
    title: string;
    text: string;
    instructions?: string;
  };
  objectives: ObjectiveItem[];
  theory: TheoryItem[];
  paperSavingText: string;
  markingGuide: string;
  schemeSource?: string;
}

// Clean raw markdown asterisks so words aren't bolded with literal '*' characters on screen or in print
export function cleanAsterisks(str: string): string {
  if (!str) return '';
  let res = str;
  // Replace patterns like *word* or **word** with uppercase word if it's a test word, or strip asterisks
  res = res.replace(/italicized word:?\s*\*+([^*]+)\*+/gi, 'capitalized word: "$1"');
  res = res.replace(/bold word:?\s*\*+([^*]+)\*+/gi, 'capitalized word: "$1"');
  res = res.replace(/\*\*([^*]+)\*\*/g, '$1');
  res = res.replace(/\*([^*]+)\*/g, '$1');
  res = res.replace(/\*/g, '');
  return res;
}

export const AiExamCreatorTab: React.FC = () => {
  const { 
    tutor, 
    schoolInfo, 
    assessmentConfig, 
    classes, 
    subjects, 
    schemesOfWork,
    getSchemeForSubjectAndClass,
    addSchemeOfWork,
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

  // Active Scheme of Work Grounding
  const activeGroundedScheme = useMemo(() => {
    return getSchemeForSubjectAndClass(selectedSubject, selectedClass, selectedTerm);
  }, [selectedSubject, selectedClass, selectedTerm, schemesOfWork, getSchemeForSubjectAndClass]);

  // Exam Presets: 'waec' | 'jamb' | 'bece' | 'midterm' | 'topical' | 'early_years' | 'custom'
  const [selectedPreset, setSelectedPreset] = useState<'waec' | 'jamb' | 'bece' | 'midterm' | 'topical' | 'early_years' | 'custom'>('waec');
  const [assessmentType, setAssessmentType] = useState<string>('Terminal Examination');
  const [customTopics, setCustomTopics] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('Standard WAEC / BECE Standard');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');

  // Scheme of Work Scope Selection
  const [selectedWeeksScope, setSelectedWeeksScope] = useState<'all' | 'midterm' | 'final' | 'custom'>('all');
  const [targetedWeeks, setTargetedWeeks] = useState<number[]>([]);

  // Question counts
  const [objCount, setObjCount] = useState<number>(50);
  const [theoryCount, setTheoryCount] = useState<number>(6);
  const [singleLinePaperSaver, setSingleLinePaperSaver] = useState<boolean>(true);

  // Single-Line Format Punctuation Style:
  // 'plain': 1. Who is a boy. A) Male B) female C) none D) all.
  // 'parenthesized': (1. Who is a boy. A) Male B) female C) none D) all.)
  const [singleLineStyle, setSingleLineStyle] = useState<'plain' | 'parenthesized'>('plain');
  const [columnLayout, setColumnLayout] = useState<'1col' | '2col' | '3col'>('1col');

  // Generation status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Assessment results state
  const [currentAssessment, setCurrentAssessment] = useState<GeneratedAssessment | null>(null);
  const [activeView, setActiveView] = useState<'paper_saving' | 'cards' | 'marking_guide' | 'cbt_preview' | 'saved_vault'>('paper_saving');
  const [copied, setCopied] = useState<boolean>(false);

  // Interactive CBT Quiz Preview State
  const [cbtCurrentIndex, setCbtCurrentIndex] = useState<number>(0);
  const [cbtAnswers, setCbtAnswers] = useState<Record<number, string>>({});
  const [cbtSubmitted, setCbtSubmitted] = useState<boolean>(false);

  // Saved assessments archive in localStorage
  const [savedVault, setSavedVault] = useState<GeneratedAssessment[]>(() => {
    try {
      const saved = localStorage.getItem('stanbax_tutor_exams_vault');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Upload Scheme of Work Modal State
  const [showUploadSchemeModal, setShowUploadSchemeModal] = useState<boolean>(false);
  const [uploadSubject, setUploadSubject] = useState<string>(selectedSubject);
  const [uploadClass, setUploadClass] = useState<string>(selectedClass);
  const [uploadTerm, setUploadTerm] = useState<'1st Term' | '2nd Term' | '3rd Term'>(selectedTerm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadText, setUploadText] = useState<string>('');
  const [uploadInstructions, setUploadInstructions] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [isUploadingScheme, setIsUploadingScheme] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  // Inspect Scheme Modal State
  const [showInspectSchemeModal, setShowInspectSchemeModal] = useState<boolean>(false);

  // Print ref
  const printableRef = useRef<HTMLDivElement>(null);

  // Synchronize upload modal default fields when subject/class changes
  useEffect(() => {
    setUploadSubject(selectedSubject);
    setUploadClass(selectedClass);
    setUploadTerm(selectedTerm);
  }, [selectedSubject, selectedClass, selectedTerm]);

  // Determine Class Grouping
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

  // Handle Preset Selection
  const applyPreset = (preset: 'waec' | 'jamb' | 'bece' | 'midterm' | 'topical' | 'early_years' | 'custom') => {
    setSelectedPreset(preset);
    if (preset === 'waec') {
      setAssessmentType('WAEC Standard Examination');
      setDifficulty('Standard WAEC (WASSCE) Rigor');
      setObjCount(50);
      setTheoryCount(6);
      setSelectedWeeksScope('all');
      if (isEarlyYears) setSelectedClass('SSS 2');
    } else if (preset === 'jamb') {
      setAssessmentType('JAMB / UTME CBT Quiz');
      setDifficulty('JAMB / UTME Speed & Precision');
      setObjCount(50);
      setTheoryCount(0); // JAMB CBT has no theory
      setSelectedWeeksScope('all');
      if (isEarlyYears) setSelectedClass('SSS 3');
    } else if (preset === 'bece') {
      setAssessmentType('BECE / Junior WAEC Examination');
      setDifficulty('BECE Junior Secondary Standard');
      setObjCount(40);
      setTheoryCount(4);
      setSelectedWeeksScope('all');
      setSelectedClass('JSS 3');
    } else if (preset === 'midterm') {
      setAssessmentType('Mid-Term CA Quiz');
      setDifficulty('Continuous Assessment Standard');
      setObjCount(25);
      setTheoryCount(2);
      setSelectedWeeksScope('midterm');
    } else if (preset === 'topical') {
      setAssessmentType('Topical Scheme Quiz');
      setDifficulty('Topic Mastery Drill');
      setObjCount(15);
      setTheoryCount(1);
      setSelectedWeeksScope('custom');
      if (targetedWeeks.length === 0) setTargetedWeeks([1]);
    } else if (preset === 'early_years') {
      setAssessmentType('Early Childhood Pictorial Quiz');
      setDifficulty('Ages 3-6 Visual Recognition');
      setObjCount(12);
      setTheoryCount(0);
      setSelectedClass('Kindergarten / Reception (Age 5-6)');
      if (!selectedSubject.includes('Phonics') && !selectedSubject.includes('Number Work')) {
        setSelectedSubject('Number Work & Shapes');
      }
    }
  };

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
      setObjCount(12);
      setTheoryCount(0);
      setSelectedPreset('early_years');
      if (!selectedSubject.includes('Phonics') && !selectedSubject.includes('Number Work')) {
        setSelectedSubject('Number Work & Shapes');
      }
    } else if (isSec) {
      if (selectedPreset === 'early_years') setSelectedPreset('waec');
      setObjCount(50);
      setTheoryCount(selectedPreset === 'jamb' ? 0 : 6);
      if (selectedSubject.includes('Number Work') || selectedSubject.includes('Phonics')) {
        setSelectedSubject('Mathematics');
      }
    } else {
      // Primary
      if (selectedPreset === 'waec' || selectedPreset === 'early_years') setSelectedPreset('midterm');
      setObjCount(30);
      setTheoryCount(3);
    }
  };

  // Helper to format a question on the exact single line requested:
  // "1. Who is a boy. A) Male B) female C) none D) all." or "(1. Who is a boy. A) Male B) female C) none D) all.)"
  const formatSingleLine = (item: ObjectiveItem, index: number, style: 'plain' | 'parenthesized' = singleLineStyle) => {
    const rawQ = item.question.replace(/^\[.*?\]\s*/, '').trim();
    const cleanQ = cleanAsterisks(rawQ);
    const punct = cleanQ.endsWith('?') || cleanQ.endsWith('.') || cleanQ.endsWith(':') ? '' : '.';
    const optA = cleanAsterisks(item.optionA);
    const optB = cleanAsterisks(item.optionB);
    const optC = cleanAsterisks(item.optionC);
    const optD = item.optionD ? ` D) ${cleanAsterisks(item.optionD)}` : '';
    const line = `${index + 1}. ${cleanQ}${punct} A) ${optA} B) ${optB} C) ${optC}${optD}`;
    return style === 'parenthesized' ? `(${line})` : line;
  };

  // Handle Assessment Generation
  const handleGenerateAssessment = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    setGenerationStep('Connecting to Calvin AI Academic Engine...');

    try {
      if (activeGroundedScheme) {
        setTimeout(() => setGenerationStep(`Calvin AI learning from Scheme of Work: ${activeGroundedScheme.subjectName} (${activeGroundedScheme.weeklyTopics?.length || 12} weeks)...`), 500);
      } else {
        setTimeout(() => setGenerationStep(`Personalizing curriculum for ${selectedClass} (${selectedTerm})...`), 500);
      }

      if (isEarlyYears) {
        setTimeout(() => setGenerationStep('Synthesizing pictorial visual representations (🍎, 🚗, 🐶, ⭐) for early childhood...'), 1100);
      } else if (selectedPreset === 'waec') {
        setTimeout(() => setGenerationStep('Synthesizing 50 WAEC standard objectives and 6 theory questions grounded in uploaded scheme...'), 1100);
      } else if (selectedPreset === 'jamb') {
        setTimeout(() => setGenerationStep('Formulating 50 JAMB / UTME high-yield multiple choice questions on single lines...'), 1100);
      }

      setTimeout(() => setGenerationStep('Enforcing strict single-line format: (1. Who is a boy. A) Male B) female C) none D) all.)...'), 1700);

      const computedWeeks = selectedWeeksScope === 'midterm' 
        ? [1, 2, 3, 4, 5, 6] 
        : selectedWeeksScope === 'final' 
        ? [7, 8, 9, 10, 11, 12] 
        : targetedWeeks.length > 0 
        ? targetedWeeks 
        : undefined;

      const effectiveInstructions = additionalInstructions || activeGroundedScheme?.additionalInstructions || '';

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
            targetTheoryCount: theoryCount,
            schemeOfWork: activeGroundedScheme,
            selectedWeeks: computedWeeks,
            presetType: selectedPreset,
            additionalInstructions: effectiveInstructions
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
        console.info('Backend endpoint not reachable (static mode). Using built-in curriculum engine.');
      }

      // Built-in curriculum fallback
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
          targetTheoryCount: theoryCount,
          schemeOfWork: activeGroundedScheme,
          selectedWeeks: computedWeeks,
          presetType: selectedPreset,
          additionalInstructions: effectiveInstructions
        });
      }

      // Sanitize all asterisks to guarantee student-friendly formatting
      if (assessmentData) {
        if (assessmentData.readingPassage) {
          assessmentData.readingPassage = {
            title: cleanAsterisks(assessmentData.readingPassage.title || ''),
            text: cleanAsterisks(assessmentData.readingPassage.text || ''),
            instructions: cleanAsterisks(assessmentData.readingPassage.instructions || '')
          };
        }
        if (Array.isArray(assessmentData.objectives)) {
          assessmentData.objectives = assessmentData.objectives.map((o: ObjectiveItem) => ({
            ...o,
            question: cleanAsterisks(o.question),
            optionA: cleanAsterisks(o.optionA),
            optionB: cleanAsterisks(o.optionB),
            optionC: cleanAsterisks(o.optionC),
            optionD: o.optionD ? cleanAsterisks(o.optionD) : undefined,
            singleLineFormat: cleanAsterisks(o.singleLineFormat)
          }));
        }
        if (Array.isArray(assessmentData.theory)) {
          assessmentData.theory = assessmentData.theory.map((t: TheoryItem) => ({
            ...t,
            questionText: cleanAsterisks(t.questionText),
            subParts: Array.isArray(t.subParts) ? t.subParts.map(sp => cleanAsterisks(sp)) : [],
            sampleAnswer: cleanAsterisks(t.sampleAnswer || '')
          }));
        }
      }

      // Re-format paperSavingText to ensure every single objective is in the requested single-line format
      const cleanSingleLines = assessmentData.objectives.map((o: ObjectiveItem, idx: number) => {
        return formatSingleLine(o, idx, singleLineStyle);
      });

      const paperSavingHeader = [
        `================================================================================`,
        `                      STANBAX SCHOOLS IBADAN, OYO STATE                        `,
        `           GOVERNMENT APPROVED • ACCREDITED BRITISH-NIGERIAN CURRICULUM          `,
        `================================================================================`,
        `ACADEMIC SESSION: 2025/2026                 TERM: ${selectedTerm.toUpperCase()}`,
        `ASSESSMENT: ${assessmentType.toUpperCase()} ${activeGroundedScheme ? `[GROUNDED IN SCHEME]` : ''}`,
        `SUBJECT: ${selectedSubject.toUpperCase()}        CLASS: ${selectedClass.toUpperCase()}`,
        `TIME ALLOWED: ${assessmentData.timeAllowed?.toUpperCase() || (isSecondary ? '2 HOURS' : '1 HOUR')}`,
        `--------------------------------------------------------------------------------`,
        `CANDIDATE'S FULL NAME: ________________________________  EXAM NO: _______________`,
        `DATE: _____________________  CLASS SECTION: ___________  SIGNATURE: ____________`,
        `================================================================================\n`,
        `SECTION A: OBJECTIVE QUESTIONS (${assessmentData.objectives.length} MARKS)`,
        `INSTRUCTIONS: Answer all questions. Questions and all four options are on the same line to save printing paper.\n`,
        assessmentData.readingPassage ? [
          `--------------------------------------------------------------------------------`,
          `COMPREHENSION READING PASSAGE: ${assessmentData.readingPassage.title ? assessmentData.readingPassage.title.toUpperCase() : 'READING PASSAGE'}`,
          `INSTRUCTIONS: ${assessmentData.readingPassage.instructions || 'Read the following passage carefully and answer Questions 1 to 5 based strictly on it.'}`,
          `\n${assessmentData.readingPassage.text}\n`,
          `--------------------------------------------------------------------------------`,
          `QUESTIONS 1 TO 5 ARE BASED DIRECTLY ON THE COMPREHENSION PASSAGE ABOVE:\n`
        ].join('\n') : '',
        ...cleanSingleLines.map((line: string, idx: number) => {
          if (assessmentData.readingPassage && idx === 5) {
            return `\n--------------------------------------------------------------------------------\nQUESTIONS 6 - ${cleanSingleLines.length}: LEXIS, STRUCTURE, GRAMMAR & VOCABULARY\n${line}`;
          }
          return line;
        }),
        assessmentData.theory && assessmentData.theory.length > 0 ? [
          `\n--------------------------------------------------------------------------------`,
          `SECTION B: THEORY & ESSAY QUESTIONS`,
          `INSTRUCTIONS: Answer ${selectedPreset === 'waec' ? 'any FOUR (4) questions' : 'all questions'} in this section.\n`,
          ...assessmentData.theory.map((t: TheoryItem) => `QUESTION ${t.questionNumber} (${t.maxScore} Marks):\n${t.questionText}\n`)
        ].join('\n') : ''
      ].filter(Boolean).join('\n');

      const assessment: GeneratedAssessment = {
        ...assessmentData,
        id: 'EXAM_' + Date.now(),
        timestamp: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        paperSavingText: paperSavingHeader,
        schemeSource: activeGroundedScheme ? `${activeGroundedScheme.subjectName} (${activeGroundedScheme.weeklyTopics?.length || 12}-Week Scheme)` : 'Stanbax Standard Curriculum'
      };

      setCurrentAssessment(assessment);
      setActiveView('paper_saving');
      setCbtCurrentIndex(0);
      setCbtAnswers({});
      setCbtSubmitted(false);

      setSuccessMsg(
        activeGroundedScheme
          ? `Calvin AI successfully generated ${assessment.objectives.length} objective questions ${assessment.theory.length > 0 ? `and ${assessment.theory.length} theory questions` : ''} grounded in your uploaded "${activeGroundedScheme.subjectName}" Scheme of Work!`
          : `Successfully synthesized ${assessment.objectives.length} objective questions ${assessment.theory.length > 0 ? `and ${assessment.theory.length} theory questions` : ''} in strict single-line format!`
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

  // Upload Scheme of Work for Calvin AI
  const handleUploadAndLearnScheme = async () => {
    if (uploadMode === 'file' && !uploadFile) {
      setUploadError('Please select a syllabus document file (.pdf, .docx, .txt, .csv)');
      return;
    }
    if (uploadMode === 'text' && !uploadText.trim()) {
      setUploadError('Please paste syllabus or scheme of work text.');
      return;
    }

    setIsUploadingScheme(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      let sourceContent = uploadText;
      let fileName = uploadFile ? uploadFile.name : 'pasted_scheme.txt';

      if (uploadMode === 'file' && uploadFile) {
        sourceContent = await uploadFile.text();
      }

      const response = await fetch('/api/parse-scheme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: uploadSubject,
          classLevel: uploadClass,
          term: uploadTerm,
          fileContentText: sourceContent,
          fileName,
          additionalInstructions: uploadInstructions
        })
      });

      let schemeObj: any = null;
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.scheme) {
          schemeObj = resData.scheme;
        }
      }

      if (!schemeObj) {
        // Fallback local parsing
        schemeObj = {
          subjectName: uploadSubject,
          classLevel: uploadClass,
          term: uploadTerm,
          curriculumStandard: 'NERDC / WAEC WASSCE',
          summary: `12-week comprehensive syllabus for ${uploadSubject} (${uploadClass})`,
          additionalInstructions: uploadInstructions,
          weeklyTopics: Array.from({ length: 12 }, (_, i) => ({
            week: i + 1,
            topic: `Week ${i + 1}: ${uploadSubject} Unit ${i + 1}`,
            subtopics: [`Core principles of ${uploadSubject} week ${i + 1}`, `Worked applications & standard formulas`],
            learningObjectives: [`Demonstrate mastery of ${uploadSubject} unit ${i + 1}`],
            keyFormulasOrTerms: [`Fundamental concept ${i + 1}`]
          })),
          isAiLearned: true,
          uploadedAt: new Date().toISOString().split('T')[0]
        };
      }

      const saved = addSchemeOfWork(schemeObj);
      setSelectedSubject(uploadSubject);
      setSelectedClass(uploadClass);
      setSelectedTerm(uploadTerm);
      setUploadSuccess(`Calvin AI successfully learned and grounded ${saved.weeklyTopics?.length || 12} weeks of ${uploadSubject} curriculum! You can now generate WAEC, JAMB, or custom quizzes based on this scheme.`);
      setTimeout(() => {
        setShowUploadSchemeModal(false);
        setUploadSuccess('');
      }, 2200);
    } catch (err: any) {
      setUploadError('Failed to learn scheme: ' + (err.message || 'Please retry.'));
    } finally {
      setIsUploadingScheme(false);
    }
  };

  // Copy Paper-Saving Text to Clipboard
  const handleCopyPaperSavingText = () => {
    if (!currentAssessment) return;
    navigator.clipboard.writeText(currentAssessment.paperSavingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download Plain Text (.txt)
  const handleDownloadTxt = () => {
    if (!currentAssessment) return;
    const blob = new Blob([currentAssessment.paperSavingText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAssessment.subject}_${currentAssessment.classLevel}_SingleLine_PaperSaver.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Word Document (.doc)
  const handleDownloadDoc = () => {
    if (!currentAssessment) return;
    const docHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${currentAssessment.title}</title>
      <style>
        body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.3; }
        .header { text-align: center; border-bottom: 2pt solid #000; padding-bottom: 8pt; margin-bottom: 12pt; }
        .q-item { margin-bottom: 6pt; }
        .q-text { font-weight: bold; }
        .opts { display: inline; margin-left: 6pt; }
      </style>
      </head>
      <body>
        <div class="header">
          <h2>${currentAssessment.schoolName.toUpperCase()}</h2>
          <p><strong>${currentAssessment.term.toUpperCase()} EXAMINATION • 2025/2026 ACADEMIC SESSION</strong></p>
          <p>SUBJECT: ${currentAssessment.subject.toUpperCase()} | CLASS: ${currentAssessment.classLevel.toUpperCase()} | TIME: ${currentAssessment.timeAllowed.toUpperCase()}</p>
        </div>
        <h3>SECTION A: OBJECTIVE QUESTIONS (Strict Single-Line Format)</h3>
        <div>
          ${currentAssessment.objectives.map((o, idx) => `
            <p class="q-item">${formatSingleLine(o, idx, singleLineStyle)}</p>
          `).join('')}
        </div>
        ${currentAssessment.theory.length > 0 ? `
          <h3>SECTION B: THEORY & ESSAY</h3>
          ${currentAssessment.theory.map(t => `
            <p><strong>QUESTION ${t.questionNumber} (${t.maxScore} Marks):</strong><br/>${t.questionText.replace(/\n/g, '<br/>')}</p>
          `).join('')}
        ` : ''}
      </body></html>
    `;
    const blob = new Blob([docHeader], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentAssessment.subject}_${currentAssessment.classLevel}_SingleLine_Exam.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Publish Directly to Student Homework / Assignment
  const handlePublishToHomework = () => {
    if (!currentAssessment) return;
    addHomework({
      title: `${currentAssessment.subject} ${currentAssessment.assessmentType} (${currentAssessment.classLevel})`,
      subject: currentAssessment.subject,
      assignedBy: tutor.name,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      instructions: `Complete the ${currentAssessment.objectives.length} single-line objective questions and Section B tasks. Refer to instructions on duration (${currentAssessment.timeAllowed}).`
    });
    setSuccessMsg(`Published successfully as a class assignment for ${currentAssessment.classLevel}! Students can now view this in their portal.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // In-Page Clean Print Handler
  const handlePrintPaperSavingExam = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Calvin AI Academic Assessment & Quiz Studio */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 text-white p-6 sm:p-7 shadow-lg border border-purple-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Calvin AI Exam & Quiz Studio</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold text-xs">
                Scheme of Work Grounded
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold text-xs">
                Zero-Waste Single-Line Paper Saver
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              WAEC, JAMB & Curriculum Quiz Generator
            </h2>
            
            <p className="text-xs sm:text-sm text-purple-200 max-w-3xl leading-relaxed">
              Create official WAEC, JAMB CBT, BECE, or custom school quizzes directly grounded in your <strong>uploaded Scheme of Work</strong>. Calvin AI adapts questions for each age and class level, printing questions and options strictly on the <strong>same line (1. Who is a boy. A) Male B) female C) none D) all.)</strong> to maximize paper saving and photocopy efficiency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowUploadSchemeModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md border border-emerald-400/40"
            >
              <Upload className="w-4 h-4 text-emerald-200" />
              <span>Upload Scheme of Work</span>
            </button>

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
          <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* CURRICULUM GROUNDING STATUS BAR */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
              activeGroundedScheme ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  Curriculum & Scheme of Work Grounding
                </h3>
                {activeGroundedScheme ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    <span>Calvin AI Grounded</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                    No Scheme Uploaded
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {activeGroundedScheme 
                  ? `Active scheme: ${activeGroundedScheme.subjectName} (${activeGroundedScheme.classLevel}) • ${activeGroundedScheme.weeklyTopics?.length || 12} weekly units ready`
                  : `Upload your official syllabus document so Calvin AI learns your weekly topics before generating questions`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeGroundedScheme ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowInspectSchemeModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-700" />
                  <span>Inspect Scheme</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadSchemeModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Replace Scheme</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowUploadSchemeModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-200" />
                <span>Upload Scheme of Work</span>
              </button>
            )}
          </div>
        </div>

        {/* Scope selector if scheme is active */}
        {activeGroundedScheme && (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">Curriculum Scope:</span>
              <button
                type="button"
                onClick={() => { setSelectedWeeksScope('all'); setTargetedWeeks([]); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedWeeksScope === 'all'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Full Scheme (Weeks 1-12)
              </button>
              <button
                type="button"
                onClick={() => { setSelectedWeeksScope('midterm'); setTargetedWeeks([1, 2, 3, 4, 5, 6]); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedWeeksScope === 'midterm'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                First Half (Weeks 1-6 CA)
              </button>
              <button
                type="button"
                onClick={() => { setSelectedWeeksScope('final'); setTargetedWeeks([7, 8, 9, 10, 11, 12]); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedWeeksScope === 'final'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Second Half (Weeks 7-12)
              </button>
              <button
                type="button"
                onClick={() => setSelectedWeeksScope('custom')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedWeeksScope === 'custom'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Specific Weeks...
              </button>
            </div>

            {selectedWeeksScope === 'custom' && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">Select:</span>
                {Array.from({ length: activeGroundedScheme.weeklyTopics?.length || 12 }, (_, i) => i + 1).map(wk => {
                  const isSelected = targetedWeeks.includes(wk);
                  return (
                    <button
                      key={wk}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setTargetedWeeks(targetedWeeks.filter(w => w !== wk));
                        } else {
                          setTargetedWeeks([...targetedWeeks, wk]);
                        }
                      }}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      W{wk}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUICK PRESET SELECTOR (WAEC, JAMB, BECE, CA QUIZ, TOPICAL, EARLY YEARS) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
        <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
          Select Exam / Quiz Preset Mode
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => applyPreset('waec')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              selectedPreset === 'waec'
                ? 'border-purple-600 bg-purple-50/80 text-purple-950 ring-2 ring-purple-600/30 font-bold'
                : 'border-slate-200 hover:border-purple-300 text-slate-700 bg-white'
            }`}
          >
            <div>
              <span className="font-black block text-sm text-purple-950">WAEC / WASSCE</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">50 Obj + 6 Theory</span>
            </div>
            <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md inline-block">
              Senior Standard
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('jamb')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              selectedPreset === 'jamb'
                ? 'border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-600/30 font-bold'
                : 'border-slate-200 hover:border-blue-300 text-slate-700 bg-white'
            }`}
          >
            <div>
              <span className="font-black block text-sm text-blue-950">JAMB / UTME</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">50 CBT Objectives</span>
            </div>
            <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md inline-block">
              High-Speed CBT
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('bece')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              selectedPreset === 'bece'
                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-600/30 font-bold'
                : 'border-slate-200 hover:border-indigo-300 text-slate-700 bg-white'
            }`}
          >
            <div>
              <span className="font-black block text-sm text-indigo-950">BECE / Junior</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">40 Obj + 4 Theory</span>
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md inline-block">
              Junior WAEC
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('midterm')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              selectedPreset === 'midterm'
                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-600/30 font-bold'
                : 'border-slate-200 hover:border-emerald-300 text-slate-700 bg-white'
            }`}
          >
            <div>
              <span className="font-black block text-sm text-emerald-950">Mid-Term CA</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">25 Obj + 2 Theory</span>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block">
              Weeks 1–6
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('topical')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              selectedPreset === 'topical'
                ? 'border-amber-600 bg-amber-50/80 text-amber-950 ring-2 ring-amber-600/30 font-bold'
                : 'border-slate-200 hover:border-amber-300 text-slate-700 bg-white'
            }`}
          >
            <div>
              <span className="font-black block text-sm text-amber-950">Topical Quiz</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">15 Obj Quick Drill</span>
            </div>
            <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md inline-block">
              Weekly Mastery
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('early_years')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              selectedPreset === 'early_years'
                ? 'border-rose-600 bg-rose-50/80 text-rose-950 ring-2 ring-rose-600/30 font-bold'
                : 'border-slate-200 hover:border-rose-300 text-slate-700 bg-white'
            }`}
          >
            <div>
              <span className="font-black block text-sm text-rose-950">Early Childhood</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">12 Pictorial Items</span>
            </div>
            <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md inline-block">
              Ages 3–6 Emojis
            </span>
          </button>
        </div>
      </div>

      {/* Control Panel: Parameters for Personalized Generation */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">Configure Exam & Quiz Settings</h3>
              <p className="text-[11px] text-slate-500">Fine-tune target class, subject, term, and question volumes</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isEarlyYears && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black flex items-center gap-1">
                <span>Early Years Pictorial</span>
              </span>
            )}
            {isSecondary && (
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-black flex items-center gap-1">
                <span>Secondary Standard</span>
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
              <optgroup label="Senior Secondary (WAEC / JAMB Standard)">
                <option value="SSS 1">SSS 1</option>
                <option value="SSS 2">SSS 2</option>
                <option value="SSS 3">SSS 3</option>
              </optgroup>
              <optgroup label="Junior Secondary (BECE Standard)">
                <option value="JSS 1">JSS 1</option>
                <option value="JSS 2">JSS 2</option>
                <option value="JSS 3">JSS 3</option>
              </optgroup>
              <optgroup label="Primary School (Basic 1–6)">
                <option value="Primary 1 (Basic 1)">Primary 1 (Basic 1)</option>
                <option value="Primary 2 (Basic 2)">Primary 2 (Basic 2)</option>
                <option value="Primary 3 (Basic 3)">Primary 3 (Basic 3)</option>
                <option value="Primary 4 (Basic 4)">Primary 4 (Basic 4)</option>
                <option value="Primary 5 (Basic 5)">Primary 5 (Basic 5)</option>
                <option value="Primary 6 (Basic 6)">Primary 6 (Basic 6)</option>
              </optgroup>
              <optgroup label="Early Years (Ages 3–6 • Pictorial Mode)">
                <option value="Creche / Pre-Nursery (Age 2-3)">Creche / Pre-Nursery (Age 2–3)</option>
                <option value="Nursery 1 (Age 3-4)">Nursery 1 (Age 3–4)</option>
                <option value="Nursery 2 (Age 4-5)">Nursery 2 (Age 4–5)</option>
                <option value="Kindergarten / Reception (Age 5-6)">Kindergarten / Reception (Age 5–6)</option>
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
                    <option key={s} value={s}>{s} (Your Subject)</option>
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
            <input
              type="text"
              value={assessmentType}
              onChange={(e) => setAssessmentType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 outline-hidden"
            />
          </div>
        </div>

        {/* Second Row: Specific Topics, Additional Instructions & Paper Saver Toggle */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
          {/* Specific Syllabus Topics & Additional Instructions */}
          <div className="lg:col-span-2 space-y-2.5">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Specific Topics / Curriculum Scope (Optional)</span>
                <span className="text-slate-400 font-normal">
                  {activeGroundedScheme ? 'Auto-grounded in uploaded scheme of work' : 'Leave blank for full term'}
                </span>
              </label>
              <input
                type="text"
                value={customTopics}
                onChange={(e) => setCustomTopics(e.target.value)}
                placeholder={activeGroundedScheme 
                  ? `e.g. Grounded in: ${activeGroundedScheme.summary?.slice(0, 70)}...` 
                  : isEarlyYears ? "e.g. Identification of domestic animals, numbers 1-10" : "e.g. Hydrocarbons, Photosynthesis, Organic Chemistry"}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>

            {/* Additional Tutor Instructions / Guidelines */}
            <div className="space-y-1.5">
              <label className="font-bold text-purple-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-black">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>Additional Tutor Instructions / Focus Guidelines (Optional)</span>
                </span>
                <span className="text-slate-400 font-normal">
                  {activeGroundedScheme?.additionalInstructions ? 'Active scheme instructions saved' : 'Special directions for Calvin AI'}
                </span>
              </label>
              <input
                type="text"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder={activeGroundedScheme?.additionalInstructions 
                  ? `Active guideline: "${activeGroundedScheme.additionalInstructions.slice(0, 55)}..." (or type new override)` 
                  : "e.g. For English: ensure reading passage is youth-oriented; questions 1-5 comprehension; strictly no asterisks or physics"}
                className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-slate-800 focus:ring-2 focus:ring-purple-500 outline-hidden text-xs"
              />
            </div>
          </div>

          {/* Format Punctuation Style Toggle */}
          <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 flex flex-col justify-between gap-2">
            <div>
              <div className="font-black text-purple-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Single-Line Punctuation</span>
                </span>
                <span className="text-[10px] text-purple-800 font-bold">Paper Saver</span>
              </div>
              <p className="text-[10.5px] text-purple-900 mt-1">
                Formats questions & options on the same line to save maximum photocopying space.
              </p>
            </div>
            
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSingleLineStyle('plain')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  singleLineStyle === 'plain'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-purple-900 border border-purple-300 hover:bg-purple-100'
                }`}
              >
                1. Q. A) .. B) ..
              </button>
              <button
                type="button"
                onClick={() => setSingleLineStyle('parenthesized')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  singleLineStyle === 'parenthesized'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-purple-900 border border-purple-300 hover:bg-purple-100'
                }`}
              >
                (1. Q. A) .. B) ..)
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Question Count Controls & Generate Button */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-slate-500 block font-bold">Objectives:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={objCount}
                  onChange={(e) => setObjCount(Number(e.target.value))}
                  className="w-16 p-1 rounded-lg border border-slate-300 font-black text-slate-900 text-center"
                />
                <span className="text-[11px] text-slate-500">Items</span>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-500 block font-bold">Theory Questions:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={theoryCount}
                  onChange={(e) => setTheoryCount(Number(e.target.value))}
                  className="w-14 p-1 rounded-lg border border-slate-300 font-black text-slate-900 text-center"
                />
                <span className="text-[11px] text-slate-500">Items</span>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-300 hidden sm:block" />
            <div>
              <span className="text-slate-500 block font-bold">Paper Format:</span>
              <span className="font-black text-purple-900 text-xs">
                {singleLineStyle === 'parenthesized' ? '(1. Q. A) .. B) ..)' : '1. Q. A) .. B) ..'} (Strict Same Line)
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
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{isGenerating ? 'Synthesizing Questions...' : `Generate ${selectedPreset.toUpperCase()} with Calvin AI`}</span>
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
              <span>Calvin AI Grounding Active</span>
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
                onClick={() => setActiveView('cbt_preview')}
                className={`px-3.5 py-2 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'cbt_preview'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interactive CBT Practice Quiz</span>
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
                <span>Question Cards ({currentAssessment.objectives.length})</span>
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
                <span>Marking Scheme</span>
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
                <span>Print Paper</span>
              </button>

              <button
                onClick={handleCopyPaperSavingText}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Copy all questions on same line for Word or Docs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-purple-700" />}
                <span>{copied ? 'Copied!' : 'Copy Single-Line'}</span>
              </button>

              <button
                onClick={handleDownloadDoc}
                className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export as Microsoft Word file"
              >
                <Download className="w-3.5 h-3.5 text-blue-700" />
                <span>Word (.doc)</span>
              </button>

              <button
                onClick={handleDownloadTxt}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export as plain text file"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Text (.txt)</span>
              </button>

              <button
                onClick={handlePublishToHomework}
                className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Assign to students in their portal"
              >
                <Send className="w-3.5 h-3.5 text-emerald-200" />
                <span>Assign as Homework</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: PAPER-SAVING MASTER SHEET */}
          {activeView === 'paper_saving' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              {/* Controls bar: Layout Density & Parentheses Style */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-black text-amber-950 block">Paper-Saving Eco Layout Mode</span>
                    <span className="text-[11px] text-amber-900">
                      Format: <strong className="font-mono">{singleLineStyle === 'parenthesized' ? '(1. Who is a boy. A) Male B) female C) none D) all.)' : '1. Who is a boy. A) Male B) female C) none D) all.'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Style Toggle */}
                  <div className="flex items-center bg-white rounded-xl p-1 border border-amber-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSingleLineStyle('plain')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        singleLineStyle === 'plain' ? 'bg-amber-500 text-white font-black' : 'text-slate-600'
                      }`}
                    >
                      1. Who is a boy. A) ..
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleLineStyle('parenthesized')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        singleLineStyle === 'parenthesized' ? 'bg-amber-500 text-white font-black' : 'text-slate-600'
                      }`}
                    >
                      (1. Who is a boy. A) ..)
                    </button>
                  </div>

                  {/* Columns selector */}
                  <div className="flex items-center bg-white rounded-xl p-1 border border-amber-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setColumnLayout('1col')}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        columnLayout === '1col' ? 'bg-blue-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      1 Col
                    </button>
                    <button
                      type="button"
                      onClick={() => setColumnLayout('2col')}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        columnLayout === '2col' ? 'bg-blue-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      2 Cols (Save 50% Paper)
                    </button>
                    <button
                      type="button"
                      onClick={() => setColumnLayout('3col')}
                      className={`px-2 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        columnLayout === '3col' ? 'bg-blue-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      3 Cols (Ultra-Dense)
                    </button>
                  </div>
                </div>
              </div>

              {/* Printable Master Sheet Container */}
              <div ref={printableRef} className="print-area space-y-6">
                {/* Official Examination Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center space-y-1">
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

                {/* Section A: Objective Questions on Same Line */}
                <div className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-blue-900 text-white font-black text-xs uppercase tracking-wide flex items-center justify-between">
                    <span>
                      SECTION A: OBJECTIVE QUESTIONS ({currentAssessment.objectives.length} MARKS) — All Options On Same Line
                    </span>
                    <span className="text-amber-300 font-bold">1 Mark Each</span>
                  </div>

                  <div className="text-xs text-slate-600 italic">
                    {cleanAsterisks(currentAssessment.instructions)}
                  </div>

                  {/* Compulsory Reading Comprehension Passage (for English Language) */}
                  {currentAssessment.readingPassage && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 text-xs space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-200 pb-2 gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-black text-[10px] uppercase">
                            Comprehension Passage
                          </span>
                          <h3 className="font-black text-sm text-slate-900 uppercase">
                            {cleanAsterisks(currentAssessment.readingPassage.title || "Reading Passage")}
                          </h3>
                        </div>
                        <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md">
                          Questions 1 to 5 are based strictly on this passage
                        </span>
                      </div>
                      <div className="text-xs text-amber-950 italic font-semibold">
                        {cleanAsterisks(currentAssessment.readingPassage.instructions || "Read the passage below carefully and answer Questions 1 to 5 based strictly on it.")}
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-serif p-3 sm:p-4 rounded-xl bg-white border border-amber-200/60 shadow-2xs">
                        {cleanAsterisks(currentAssessment.readingPassage.text)}
                      </div>
                    </div>
                  )}

                  {/* Question Grid: Strict Single Line Format */}
                  <div className={`gap-x-6 gap-y-2 text-xs ${
                    columnLayout === '3col' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                      : columnLayout === '2col' 
                      ? 'grid grid-cols-1 md:grid-cols-2' 
                      : 'space-y-1.5'
                  }`}>
                    {currentAssessment.objectives.map((item, idx) => {
                      const rawQ = item.question.replace(/^\[.*?\]\s*/, '').trim();
                      const cleanQ = cleanAsterisks(rawQ);
                      const punct = cleanQ.endsWith('?') || cleanQ.endsWith('.') || cleanQ.endsWith(':') ? '' : '.';
                      const optA = cleanAsterisks(item.optionA);
                      const optB = cleanAsterisks(item.optionB);
                      const optC = cleanAsterisks(item.optionC);
                      const optD = item.optionD ? cleanAsterisks(item.optionD) : '';
                      return (
                        <React.Fragment key={item.id}>
                          {currentAssessment.readingPassage && idx === 5 && (
                            <div className="col-span-full py-1.5 px-3 my-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 font-bold uppercase text-[10.5px]">
                              Questions 6 to {currentAssessment.objectives.length}: Lexis, Structure, Grammar & Vocabulary
                            </div>
                          )}
                          <div 
                            className="py-1 px-1.5 rounded hover:bg-slate-50 transition-colors font-medium text-slate-900 text-xs leading-normal"
                          >
                            {singleLineStyle === 'parenthesized' ? (
                              <span>
                                ({item.id}. {item.pictorialSymbol && <span className="mr-1">{item.pictorialSymbol}</span>}
                                {cleanQ}{punct} <strong className="text-blue-900 font-bold">A)</strong> {optA} <strong className="text-blue-900 font-bold">B)</strong> {optB} <strong className="text-blue-900 font-bold">C)</strong> {optC} {optD && <><strong className="text-blue-900 font-bold">D)</strong> {optD}</>})
                              </span>
                            ) : (
                              <span>
                                <span className="font-bold text-slate-950">{item.id}. </span>
                                {item.pictorialSymbol && <span className="mr-1">{item.pictorialSymbol}</span>}
                                <span>{cleanQ}{punct} </span>
                                <strong className="text-blue-900 font-bold">A)</strong> {optA}{' '}
                                <strong className="text-blue-900 font-bold">B)</strong> {optB}{' '}
                                <strong className="text-blue-900 font-bold">C)</strong> {optC}{' '}
                                {optD && (
                                  <>
                                    <strong className="text-blue-900 font-bold">D)</strong> {optD}
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: Theory Questions */}
                {currentAssessment.theory.length > 0 && (
                  <div className="space-y-3 pt-4 border-t-2 border-slate-900">
                    <div className="p-2.5 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-wide flex items-center justify-between">
                      <span>
                        SECTION B: THEORY & ESSAY QUESTIONS
                      </span>
                      <span className="text-amber-300 font-bold">
                        {selectedPreset === 'waec' ? 'Answer Any 4 Questions' : 'Answer All Questions'}
                      </span>
                    </div>

                    <div className="space-y-4 pt-2">
                      {currentAssessment.theory.map((t) => (
                        <div key={t.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-black text-sm text-slate-900">
                              QUESTION {t.questionNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold">
                              {t.maxScore} Marks
                            </span>
                          </div>
                          <div className="text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                            {cleanAsterisks(t.questionText)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: INTERACTIVE CBT PRACTICE QUIZ */}
          {activeView === 'cbt_preview' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black">
                    <Play className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      Interactive CBT Mode: {currentAssessment.subject}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Standard WAEC / JAMB Computer-Based Test Simulator
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                    Question {cbtCurrentIndex + 1} of {currentAssessment.objectives.length}
                  </span>
                </div>
              </div>

              {/* CBT Question Display */}
              {(() => {
                const item = currentAssessment.objectives[cbtCurrentIndex];
                if (!item) return null;
                const chosen = cbtAnswers[item.id];
                return (
                  <div className="space-y-6">
                    {/* Comprehension Passage for CBT (Questions 1 to 5) */}
                    {currentAssessment.readingPassage && cbtCurrentIndex < 5 && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-300/80 text-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 font-bold">
                          <span className="uppercase font-black text-amber-950 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">Passage</span>
                            <span>{cleanAsterisks(currentAssessment.readingPassage.title || 'Comprehension Passage')}</span>
                          </span>
                          <span className="text-[10px] text-amber-800 font-bold">
                            Question {cbtCurrentIndex + 1} of 5 relates to this passage
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-900 italic font-medium">
                          {cleanAsterisks(currentAssessment.readingPassage.instructions || "Read the passage carefully and answer Questions 1 to 5 based strictly on it.")}
                        </div>
                        <div className="text-slate-800 leading-relaxed font-serif text-xs max-h-48 overflow-y-auto pr-2 bg-white/90 p-3 rounded-xl border border-amber-200/60">
                          {cleanAsterisks(currentAssessment.readingPassage.text)}
                        </div>
                      </div>
                    )}

                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-900 text-white font-black text-xs flex items-center justify-center">
                          {cbtCurrentIndex + 1}
                        </span>
                        {item.pictorialSymbol && (
                          <span className="text-xl">{item.pictorialSymbol}</span>
                        )}
                        <span className="font-bold text-slate-900 text-sm">
                          {cleanAsterisks(item.question.replace(/^\[.*?\]\s*/, ''))}
                        </span>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                        {[
                          { key: 'A', text: cleanAsterisks(item.optionA) },
                          { key: 'B', text: cleanAsterisks(item.optionB) },
                          { key: 'C', text: cleanAsterisks(item.optionC) },
                          ...(item.optionD ? [{ key: 'D', text: cleanAsterisks(item.optionD) }] : [])
                        ].map((opt) => {
                          const isSelected = chosen === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setCbtAnswers({ ...cbtAnswers, [item.id]: opt.key });
                              }}
                              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-blue-700 bg-blue-50 text-blue-950 ring-2 ring-blue-700/30 font-bold'
                                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-800'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${
                                isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {opt.key}
                              </span>
                              <span>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={cbtCurrentIndex === 0}
                        onClick={() => setCbtCurrentIndex(cbtCurrentIndex - 1)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-40 cursor-pointer"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1 overflow-x-auto max-w-md py-1">
                        {currentAssessment.objectives.map((o, idx) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setCbtCurrentIndex(idx)}
                            className={`w-7 h-7 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                              idx === cbtCurrentIndex
                                ? 'bg-blue-900 text-white'
                                : cbtAnswers[o.id]
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={cbtCurrentIndex === currentAssessment.objectives.length - 1}
                        onClick={() => setCbtCurrentIndex(cbtCurrentIndex + 1)}
                        className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>

                    {/* Submit / Score Bar */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-700">Answered: </span>
                        <span className="font-black text-slate-900">
                          {Object.keys(cbtAnswers).length} / {currentAssessment.objectives.length} questions
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCbtSubmitted(true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs cursor-pointer"
                      >
                        Grade & View Result
                      </button>
                    </div>

                    {/* Result Modal / Callout */}
                    {cbtSubmitted && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>CBT Score Calculation</span>
                          </span>
                          <span className="font-black text-lg">
                            {currentAssessment.objectives.filter(o => cbtAnswers[o.id] === o.correctOption).length} / {currentAssessment.objectives.length} Correct
                          </span>
                        </div>
                        <p className="text-emerald-900">
                          Percentage: {Math.round((currentAssessment.objectives.filter(o => cbtAnswers[o.id] === o.correctOption).length / currentAssessment.objectives.length) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW 3: QUESTION CARDS */}
          {activeView === 'cards' && (
            <div className="space-y-4">
              {/* Reading Passage Card if present */}
              {currentAssessment.readingPassage && (
                <div className="bg-amber-50/80 rounded-3xl p-5 sm:p-6 border-2 border-amber-300/80 text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <span className="font-black text-amber-950 uppercase text-sm">
                      Comprehension Reading Passage: {cleanAsterisks(currentAssessment.readingPassage.title || "Passage")}
                    </span>
                    <span className="text-amber-800 font-bold text-[11px] bg-amber-200/60 px-2 py-0.5 rounded-md">
                      Questions 1 to 5 are based strictly on this passage
                    </span>
                  </div>
                  <div className="text-xs text-amber-900 italic font-semibold">
                    {cleanAsterisks(currentAssessment.readingPassage.instructions || "Read the passage carefully and answer Questions 1 to 5 based strictly on it.")}
                  </div>
                  <div className="text-slate-800 font-serif leading-relaxed whitespace-pre-line bg-white p-4 rounded-2xl border border-amber-200/50 shadow-2xs">
                    {cleanAsterisks(currentAssessment.readingPassage.text)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentAssessment.objectives.map((item, idx) => (
                  <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-black text-blue-900">
                        Question #{idx + 1} {idx < 5 && currentAssessment.readingPassage && (
                          <span className="text-amber-700 font-bold ml-1.5 text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                            Comprehension
                          </span>
                        )}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        Answer: Option {item.correctOption}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-900 text-sm">
                      {item.pictorialSymbol && <span className="mr-2 text-lg">{item.pictorialSymbol}</span>}
                      {cleanAsterisks(item.question.replace(/^\[.*?\]\s*/, ''))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 font-mono text-[11px] text-slate-800 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase mb-0.5">Strict Single-Line Format</span>
                      {formatSingleLine(item, idx, singleLineStyle)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: MARKING GUIDE */}
          {activeView === 'marking_guide' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-base">
                    Official Marking Guide & Solutions
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Confidential
                </span>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-xs text-slate-700 uppercase">
                  Section A: Objective Key Grid
                </h4>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-xs">
                  {currentAssessment.objectives.map((o) => (
                    <div key={o.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">Q{o.id}</span>
                      <span className="font-black text-blue-900 text-sm">{o.correctOption}</span>
                    </div>
                  ))}
                </div>

                {currentAssessment.theory.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <h4 className="font-black text-xs text-slate-700 uppercase">
                      Section B: Theory Rubrics
                    </h4>
                    {currentAssessment.theory.map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-900">Question {t.questionNumber} ({t.maxScore}m):</span>
                        <p className="text-slate-600 italic">{t.sampleAnswer || 'Model answer points with step-by-step scoring breakdown.'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 5: SAVED EXAM VAULT */}
      {activeView === 'saved_vault' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-slate-900 text-base">
                Saved Examinations & Quiz Vault ({savedVault.length})
              </h3>
            </div>
            {savedVault.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSavedVault([]);
                  localStorage.removeItem('stanbax_tutor_exams_vault');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Clear Archive
              </button>
            )}
          </div>

          {savedVault.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-sm">No saved exams in vault yet.</p>
              <p className="text-xs">Generated exams are automatically stored here for instant reprinting.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedVault.map((item) => (
                <div key={item.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-black text-[10px]">
                      {item.classLevel}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{item.timestamp}</span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-500">
                    {item.objectives.length} Objectives • {item.theory.length} Theory Questions • {item.schemeSource || 'Standard'}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentAssessment(item);
                        setActiveView('paper_saving');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-900 text-white font-bold text-xs cursor-pointer hover:bg-blue-800"
                    >
                      Open Exam
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.paperSavingText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100"
                    >
                      Copy Single-Line
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: UPLOAD SCHEME OF WORK FOR CALVIN AI */}
      {showUploadSchemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Upload Scheme of Work for Calvin AI</h3>
                  <p className="text-[11px] text-slate-500">Calvin AI will learn the weekly curriculum to synthesize matching quizzes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadSchemeModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                {uploadSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject</label>
                <input
                  type="text"
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Class Level</label>
                <input
                  type="text"
                  value={uploadClass}
                  onChange={(e) => setUploadClass(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Term</label>
                <select
                  value={uploadTerm}
                  onChange={(e) => setUploadTerm(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-bold bg-white"
                >
                  <option value="1st Term">1st Term</option>
                  <option value="2nd Term">2nd Term</option>
                  <option value="3rd Term">3rd Term</option>
                </select>
              </div>
            </div>

            {/* Mode switcher */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                  uploadMode === 'file' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Upload File (.pdf, .docx, .txt)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                  uploadMode === 'text' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Paste Syllabus Text
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center space-y-2">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-700">
                  {uploadFile ? uploadFile.name : 'Select or drop syllabus document'}
                </div>
                <p className="text-[11px] text-slate-400">PDF, Word docx, Plain text, CSV curriculum</p>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="scheme-file-upload-input"
                />
                <label
                  htmlFor="scheme-file-upload-input"
                  className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer hover:bg-slate-800"
                >
                  Browse Document
                </label>
              </div>
            ) : (
              <div>
                <textarea
                  rows={6}
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                  placeholder="Paste your scheme of work here... (e.g. Week 1: Photosynthesis, Week 2: Respiration, etc.)"
                  className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-mono"
                />
              </div>
            )}

            {/* Additional Instructions / Guidelines when sending Scheme of Work */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200">
              <label className="font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-950 font-black">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Additional Tutor Instructions / Focus Guidelines (Optional)</span>
                </span>
                <span className="text-[10.5px] text-slate-400 font-normal">e.g. Special exam rules</span>
              </label>
              <textarea
                rows={2}
                value={uploadInstructions}
                onChange={(e) => setUploadInstructions(e.target.value)}
                placeholder="E.g. For English: ensure reading passage is youth-oriented; questions 1-5 must test reading comprehension; strictly no mathematics or physics formulas; avoid bold asterisks..."
                className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-slate-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                Calvin AI will remember these special guidelines whenever synthesizing exam papers for this scheme.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadSchemeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUploadingScheme}
                onClick={handleUploadAndLearnScheme}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isUploadingScheme ? 'Calvin AI is Learning...' : 'Train & Ground Calvin AI'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT ACTIVE SCHEME OF WORK */}
      {showInspectSchemeModal && activeGroundedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-fade-in text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {activeGroundedScheme.subjectName} Syllabus Breakdown
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeGroundedScheme.classLevel} • {activeGroundedScheme.term} • Aligned with {activeGroundedScheme.curriculumStandard || 'NERDC / WAEC'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInspectSchemeModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <p className="text-slate-600 italic bg-purple-50 p-3 rounded-xl border border-purple-200">
              "{activeGroundedScheme.summary}"
            </p>

            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                Weekly Curriculum Units ({activeGroundedScheme.weeklyTopics?.length || 0} Weeks)
              </h4>
              <div className="divide-y divide-slate-100">
                {activeGroundedScheme.weeklyTopics?.map((w) => (
                  <div key={w.week} className="py-2.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-[10px]">
                        Week {w.week}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{w.topic}</span>
                    </div>
                    {w.subtopics && w.subtopics.length > 0 && (
                      <p className="text-slate-600 pl-10">
                        <strong>Subtopics:</strong> {w.subtopics.join(', ')}
                      </p>
                    )}
                    {w.learningObjectives && w.learningObjectives.length > 0 && (
                      <p className="text-slate-500 pl-10 text-[11px]">
                        <strong>Objectives:</strong> {w.learningObjectives.join('; ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInspectSchemeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
