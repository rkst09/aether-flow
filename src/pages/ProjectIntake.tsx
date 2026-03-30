import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Types ---
type UploadState = "idle" | "dragging" | "uploading" | "processing" | "complete" | "error";
type ErrorType = "unsupported" | "too-large" | "network" | "processing" | null;

const STAGES = [
  { label: "Upload", short: "Upload" },
  { label: "Design Intake", short: "Intake" },
  { label: "Screens", short: "Screens" },
  { label: "Prototype", short: "Prototype" },
  { label: "Audit", short: "Audit" },
  { label: "Copy", short: "Copy" },
  { label: "Docs", short: "Docs" },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const PROCESSING_MESSAGES = [
  "Reading document structure…",
  "Extracting key sections…",
  "Identifying project requirements…",
  "Preparing for analysis…",
];

const INDUSTRIES = ["SaaS", "Fintech", "Healthtech", "Edtech", "E-commerce", "AI / ML", "Web3", "Logistics", "Enterprise", "Consumer", "Other"];
const PRODUCT_TYPES = ["Web App", "Mobile App", "Dashboard", "Marketplace", "SaaS Platform", "Design System", "Marketing Site", "Internal Tool"];
const MARKETS = ["B2B", "B2C", "D2C", "B2B2C", "Enterprise", "Government", "Marketplace"];
const COMPANY_STAGES = ["Startup", "Early-stage", "Growth", "Scale-up", "Enterprise"];

// --- Connected Step Progress Tracker ---
function StageTracker({ current }: { current: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isActive = i === current;
          const isDone = i < current;
          const isLast = i === STAGES.length - 1;

          return (
            <div key={stage.label} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 relative">
                <div
                  className={`
                    h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all duration-300 shrink-0
                    ${isDone ? "gradient-accent text-accent-foreground" : ""}
                    ${isActive ? "bg-accent/10 text-accent ring-2 ring-accent/25" : ""}
                    ${!isDone && !isActive ? "bg-secondary text-muted-foreground/50" : ""}
                  `}
                >
                  {isDone ? (
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-colors duration-300 ${
                    isActive ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {stage.short}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 h-px mx-1.5 mt-[-18px]">
                  <div
                    className={`h-full w-full rounded-full transition-colors duration-500 ${
                      isDone ? "bg-accent/40" : "bg-border"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Error Message ---
function ErrorMessage({ type, onRetry }: { type: ErrorType; onRetry: () => void }) {
  const messages: Record<string, { title: string; desc: string; retry?: boolean }> = {
    unsupported: {
      title: "Unsupported file format",
      desc: "Please upload PDF, DOCX, or DOC files.",
    },
    "too-large": {
      title: "File exceeds size limit",
      desc: "Please upload a document under 25 MB.",
    },
    network: {
      title: "Upload failed",
      desc: "Please check your connection and try again.",
      retry: true,
    },
    processing: {
      title: "Couldn't process this file",
      desc: "Try another document or re-upload.",
      retry: true,
    },
  };

  if (!type) return null;
  const msg = messages[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-start gap-3 rounded-xl bg-destructive/5 border border-destructive/10 px-4 py-3 mt-3"
    >
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{msg.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{msg.desc}</p>
      </div>
      {msg.retry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium text-accent hover:text-accent/80 flex items-center gap-1 shrink-0"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      )}
    </motion.div>
  );
}

// --- Upload Zone ---
function UploadZone({
  state,
  errorType,
  fileName,
  progress,
  processingMessage,
  onDrop,
  onFileSelect,
  onRetry,
  onRemove,
}: {
  state: UploadState;
  errorType: ErrorType;
  fileName: string | null;
  progress: number;
  processingMessage: string;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      onDrop(e);
    },
    [onDrop]
  );

  const isInteractive = state === "idle" || state === "error";

  return (
    <div className="space-y-0">
      <motion.div
        onDragOver={isInteractive ? handleDragOver : undefined}
        onDragLeave={isInteractive ? handleDragLeave : undefined}
        onDrop={isInteractive ? handleDrop : undefined}
        onClick={isInteractive ? () => inputRef.current?.click() : undefined}
        className={`relative rounded-2xl border border-dashed transition-all duration-300 ${
          state === "complete"
            ? "border-[hsl(var(--success))]/20 bg-[hsl(var(--success-soft))]"
            : dragOver
            ? "border-accent/50 bg-accent/[0.03] cursor-pointer"
            : state === "error"
            ? "border-destructive/20 bg-destructive/[0.02] cursor-pointer"
            : isInteractive
            ? "border-border hover:border-accent/30 hover:bg-accent/[0.02] cursor-pointer"
            : "border-border bg-secondary/20"
        } ${isInteractive ? "" : "pointer-events-none"}`}
        whileHover={isInteractive ? { scale: 1.003 } : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={onFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
          <AnimatePresence mode="wait">
            {(state === "idle" || (state === "error" && !dragOver)) && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="h-11 w-11 rounded-xl bg-secondary/80 flex items-center justify-center mb-4">
                  <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Upload your PRD or project document
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Drag & drop or click to browse · PDF, DOCX, DOC
                </p>
              </motion.div>
            )}

            {dragOver && (
              <motion.div
                key="drag"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Upload className="h-5 w-5 text-accent" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-accent">Drop your file here</p>
              </motion.div>
            )}

            {state === "uploading" && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center w-full max-w-xs"
              >
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Loader2 className="h-5 w-5 text-accent animate-spin" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Uploading{fileName ? ` "${fileName}"` : ""}…
                </p>
                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mt-2">
                  <motion.div
                    className="h-full gradient-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">{progress}%</p>
              </motion.div>
            )}

            {state === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Loader2 className="h-5 w-5 text-accent animate-spin" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground">{processingMessage}</p>
                <p className="text-[11px] text-muted-foreground mt-1">This may take a moment</p>
              </motion.div>
            )}

            {state === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center pointer-events-auto"
              >
                <div className="h-11 w-11 rounded-xl bg-[hsl(var(--success-soft))] flex items-center justify-center mb-4">
                  <Check className="h-5 w-5 text-[hsl(var(--success))]" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="pointer-events-auto h-5 w-5 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Document ready · Click to replace</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {state === "error" && <ErrorMessage type={errorType} onRetry={onRetry} />}
      </AnimatePresence>
    </div>
  );
}

// --- Supplementary Context Field ---
function ContextField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="rounded-xl bg-card border-border/60 h-10 text-sm hover:border-border transition-colors">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {options.map((v) => (
            <SelectItem key={v} value={v} className="text-sm">{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// --- Main Page ---
const ProjectIntake = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingMsg, setProcessingMsg] = useState(PROCESSING_MESSAGES[0]);
  
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [productType, setProductType] = useState("");
  const [market, setMarket] = useState("");
  const [companyStage, setCompanyStage] = useState("");
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [highlightUpload, setHighlightUpload] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectNameTouched, setProjectNameTouched] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const hasProgress = uploadState === "complete" || description.length > 0 || !!industry || !!productType || !!market || !!companyStage || projectName.length > 0;
  const isUploaded = uploadState === "complete";
  const canContinue = isUploaded && projectName.trim().length > 0;

  const handleBack = () => {
    if (hasProgress) {
      setShowLeaveDialog(true);
    } else {
      navigate("/");
    }
  };

  const validateFile = (f: File): ErrorType => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXTENSIONS.includes(ext)) return "unsupported";
    if (f.size > MAX_FILE_SIZE) return "too-large";
    return null;
  };

  const simulateUpload = (f: File) => {
    setFile(f);
    setFileName(f.name);
    setErrorType(null);

    const error = validateFile(f);
    if (error) {
      setUploadState("error");
      setErrorType(error);
      return;
    }

    setUploadState("uploading");
    setProgress(0);
    let p = 0;
    const uploadInterval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(uploadInterval);
        setProgress(100);
        setUploadState("processing");
        let msgIdx = 0;
        const procInterval = setInterval(() => {
          msgIdx++;
          if (msgIdx >= PROCESSING_MESSAGES.length) {
            clearInterval(procInterval);
            setUploadState("complete");
          } else {
            setProcessingMsg(PROCESSING_MESSAGES[msgIdx]);
          }
        }, 900);
      } else {
        setProgress(Math.round(p));
      }
    }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    const f = e.dataTransfer.files?.[0];
    if (f) simulateUpload(f);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) simulateUpload(f);
    e.target.value = "";
  };

  const handleRetry = () => {
    if (file) simulateUpload(file);
  };

  const handleRemove = () => {
    setUploadState("idle");
    setFileName(null);
    setFile(null);
    setProgress(0);
    setErrorType(null);
  };

  const handleContinue = async () => {
    if (!projectName.trim()) {
      setProjectNameTouched(true);
      nameInputRef.current?.focus();
      return;
    }
    if (!isUploaded) {
      setHighlightUpload(true);
      setTimeout(() => setHighlightUpload(false), 1500);
      return;
    }
    if (!user) return;

    setSaving(true);
    setSaveError("");

    try {
      let prdUrl: string | null = null;
      let prdFilename: string | null = null;

      // Upload file to Supabase Storage
      if (file) {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        prdUrl = path;
        prdFilename = file.name;
      }

      // Create project record
      const { data, error: dbError } = await supabase
        .from("projects")
        .insert({
          user_id:      user.id,
          name:         projectName.trim(),
          description:  description || null,
          prd_url:      prdUrl,
          prd_filename: prdFilename,
          domain:       industry || null,
          product_type: productType || null,
          market:       market || null,
          current_phase: 1,
          status:       "active",
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      navigate(`/project/phase/01?projectId=${data.id}`);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 pt-8 pb-16">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
              >
                <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
                Back
              </button>

              {/* Stage Tracker */}
              <div className="mb-10">
                <StageTracker current={0} />
              </div>

              {/* Page Header */}
              <div className="mb-10">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Project Intake
                </h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Upload your document and provide context to begin the design workflow.
                </p>
              </div>

              {/* === VERTICAL FLOW === */}
              <div className="space-y-10">

                {/* 1. Project Name */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">1</span>
                    <h2 className="text-sm font-medium text-foreground">Project Name</h2>
                    <span className="text-[11px] text-destructive ml-auto">Required</span>
                  </div>
                  <Input
                    ref={nameInputRef}
                    autoFocus
                    value={projectName}
                    onChange={(e) => {
                      setProjectName(e.target.value);
                      if (!projectNameTouched) setProjectNameTouched(true);
                    }}
                    onBlur={() => setProjectNameTouched(true)}
                    placeholder="Enter your project name…"
                    className="h-11 rounded-xl bg-card border-border/60 text-sm placeholder:text-muted-foreground/60 focus:border-accent/30 transition-colors"
                  />
                  {projectNameTouched && !projectName.trim() && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-destructive mt-1.5 ml-1"
                    >
                      Project name is required
                    </motion.p>
                  )}
                </section>

                {/* 2. Upload Section */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">2</span>
                    <h2 className="text-sm font-medium text-foreground">Upload Document</h2>
                  </div>
                  <motion.div animate={highlightUpload ? { scale: [1, 1.005, 1] } : {}} transition={{ duration: 0.4 }}>
                    <UploadZone
                      state={uploadState}
                      errorType={errorType}
                      fileName={fileName}
                      progress={progress}
                      processingMessage={processingMsg}
                      onDrop={handleDrop}
                      onFileSelect={handleFileSelect}
                      onRetry={handleRetry}
                      onRemove={handleRemove}
                    />
                  </motion.div>
                </section>

                {/* 3. Project Description — always visible, secondary until upload */}
                <motion.section
                  animate={{ opacity: isUploaded ? 1 : 0.5 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold transition-colors ${
                      isUploaded ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground/50"
                    }`}>3</span>
                    <h2 className="text-sm font-medium text-foreground">Project Description</h2>
                    <span className="text-[11px] text-muted-foreground ml-auto">Optional</span>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your product, goals, or anything important for this project…"
                    disabled={!isUploaded}
                    className="min-h-[120px] rounded-xl resize-none bg-card border-border/60 text-sm placeholder:text-muted-foreground/60 focus:border-accent/30 transition-colors"
                    maxLength={2000}
                  />
                  {description.length > 0 && (
                    <p className="text-[11px] text-muted-foreground text-right mt-1.5">
                      {description.length} / 2,000
                    </p>
                  )}
                </motion.section>

                {/* 4. Supplementary Context — always visible, secondary until upload */}
                <motion.section
                  animate={{ opacity: isUploaded ? 1 : 0.5 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-semibold transition-colors ${
                      isUploaded ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground/50"
                    }`}>4</span>
                    <h2 className="text-sm font-medium text-foreground">Supplementary Context</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 ml-7">
                    Improves accuracy of generated personas and outputs
                  </p>

                  <div className="surface-elevated rounded-2xl p-5 shadow-soft">
                    <div className="grid grid-cols-2 gap-4">
                      <ContextField
                        label="Industry"
                        value={industry}
                        onValueChange={setIndustry}
                        options={INDUSTRIES}
                      />
                      <ContextField
                        label="Product Type"
                        value={productType}
                        onValueChange={setProductType}
                        options={PRODUCT_TYPES}
                      />
                      <ContextField
                        label="Market"
                        value={market}
                        onValueChange={setMarket}
                        options={MARKETS}
                      />
                      <ContextField
                        label="Company Stage"
                        value={companyStage}
                        onValueChange={setCompanyStage}
                        options={COMPANY_STAGES}
                      />
                    </div>
                  </div>
                </motion.section>

                {/* 5. Primary CTA */}
                <div className="pt-2 space-y-2">
                  <Button
                    onClick={handleContinue}
                    disabled={uploadState === "uploading" || uploadState === "processing" || saving}
                    className={`w-full h-12 rounded-xl text-sm font-medium transition-all duration-300 ${
                      canContinue && !saving
                        ? "gradient-accent text-accent-foreground shadow-soft hover:shadow-elevated hover:brightness-110"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Creating project…
                      </>
                    ) : (
                      <>
                        <span>Continue to Persona Identification</span>
                        <ArrowRight className="h-4 w-4 ml-1.5" strokeWidth={1.5} />
                      </>
                    )}
                  </Button>
                  {saveError && (
                    <p className="text-[12px] text-rose-500 text-center">{saveError}</p>
                  )}
                  {!canContinue && !saving && uploadState !== "uploading" && uploadState !== "processing" && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      {!projectName.trim() ? "Enter a project name to continue" : "Upload a document to continue"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Leave Confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this page?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost. Are you sure you want to go back?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/")}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default ProjectIntake;
