import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  "Upload",
  "Design Intake",
  "Screen Derivation",
  "Prototype Prompt",
  "UX Audit",
  "Copy Review",
  "Documentation",
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const PROCESSING_MESSAGES = [
  "Reading document structure…",
  "Extracting key sections…",
  "Identifying project requirements…",
  "Preparing for analysis…",
];

const INDUSTRIES = ["SaaS", "Fintech", "Healthcare", "E-commerce", "Education", "Enterprise", "Consumer", "Other"];
const PRODUCT_TYPES = ["Web App", "Mobile App", "Desktop App", "Design System", "Marketing Site", "Internal Tool"];
const MARKETS = ["B2B", "B2C", "B2B2C", "Internal", "Marketplace"];
const COMPANY_STAGES = ["Pre-seed", "Seed", "Series A", "Series B+", "Growth", "Enterprise"];

// --- Progress Tracker ---
function StageTracker({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={stage} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "w-6 bg-accent"
                    : isDone
                    ? "w-4 bg-accent/40"
                    : "w-3 bg-border"
                }`}
              />
              <span
                className={`text-[11px] hidden sm:inline transition-colors ${
                  isActive
                    ? "text-foreground font-medium"
                    : isDone
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {stage}
              </span>
            </div>
          </div>
        );
      })}
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
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${
          state === "complete"
            ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success-soft))]"
            : dragOver
            ? "border-accent bg-accent-soft cursor-pointer"
            : state === "error"
            ? "border-destructive/20 bg-destructive/[0.02] cursor-pointer"
            : isInteractive
            ? "border-border hover:border-accent/40 hover:bg-accent-soft/50 cursor-pointer"
            : "border-border bg-secondary/30"
        } ${isInteractive ? "" : "pointer-events-none"}`}
        whileHover={isInteractive ? { scale: 1.005 } : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={onFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <AnimatePresence mode="wait">
            {/* Idle / Drag */}
            {(state === "idle" || (state === "error" && !dragOver)) && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
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

            {/* Dragging */}
            {dragOver && (
              <motion.div
                key="drag"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Upload className="h-5 w-5 text-accent" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-accent">Drop your file here</p>
              </motion.div>
            )}

            {/* Uploading */}
            {state === "uploading" && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center w-full max-w-xs"
              >
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
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

            {/* Processing */}
            {state === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Loader2 className="h-5 w-5 text-accent animate-spin" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground">{processingMessage}</p>
                <p className="text-[11px] text-muted-foreground mt-1">This may take a moment</p>
              </motion.div>
            )}

            {/* Complete */}
            {state === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center pointer-events-auto"
              >
                <div className="h-12 w-12 rounded-xl bg-[hsl(var(--success-soft))] flex items-center justify-center mb-4">
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

// --- Main Page ---
const ProjectIntake = () => {
  const navigate = useNavigate();
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

  const hasProgress = uploadState === "complete" || description.length > 0 || !!industry || !!productType || !!market || !!companyStage;

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

    // Simulate upload
    setUploadState("uploading");
    setProgress(0);
    let p = 0;
    const uploadInterval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(uploadInterval);
        setProgress(100);
        // Simulate processing
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

  const handleContinue = () => {
    if (uploadState !== "complete") {
      setHighlightUpload(true);
      setTimeout(() => setHighlightUpload(false), 1500);
      return;
    }
    // Navigate to next stage
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
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
              {/* Back + Stage Tracker */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                  Back
                </button>
                <StageTracker current={0} />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Project Intake
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload your document and provide context to get started.
                </p>
              </div>

              {/* Upload */}
              <motion.div animate={highlightUpload ? { scale: [1, 1.01, 1] } : {}} transition={{ duration: 0.4 }}>
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

              {/* Context + Metadata — revealed after upload */}
              <AnimatePresence>
                {uploadState === "complete" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-8 overflow-hidden"
                  >
                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Additional Context
                        <span className="text-muted-foreground font-normal ml-1.5">Optional</span>
                      </label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add any additional context about your project…"
                        className="min-h-[100px] rounded-xl resize-none bg-card border-border text-sm"
                      />
                      {description.length > 0 && (
                        <p className="text-[11px] text-muted-foreground text-right">
                          {description.length} / 2000
                        </p>
                      )}
                    </div>

                    {/* Supplementary Context */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Supplementary Context</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          This helps improve output quality
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Industry</label>
                          <Select value={industry} onValueChange={setIndustry}>
                            <SelectTrigger className="rounded-xl bg-card h-9 text-sm">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {INDUSTRIES.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Product Type</label>
                          <Select value={productType} onValueChange={setProductType}>
                            <SelectTrigger className="rounded-xl bg-card h-9 text-sm">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRODUCT_TYPES.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Market</label>
                          <Select value={market} onValueChange={setMarket}>
                            <SelectTrigger className="rounded-xl bg-card h-9 text-sm">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {MARKETS.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs text-muted-foreground">Company Stage</label>
                          <Select value={companyStage} onValueChange={setCompanyStage}>
                            <SelectTrigger className="rounded-xl bg-card h-9 text-sm">
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPANY_STAGES.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary CTA */}
              <div className="pt-2">
                <Button
                  onClick={handleContinue}
                  disabled={uploadState === "uploading" || uploadState === "processing"}
                  className={`w-full h-11 rounded-xl text-sm font-medium transition-all ${
                    uploadState === "complete"
                      ? "gradient-accent text-accent-foreground hover:shadow-lg hover:shadow-accent/20"
                      : "bg-secondary text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Continue to Persona Identification
                  <ArrowRight className="h-4 w-4 ml-1" strokeWidth={1.5} />
                </Button>
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
