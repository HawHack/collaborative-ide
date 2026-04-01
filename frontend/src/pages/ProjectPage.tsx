import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import axios from "axios";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Save,
  TerminalSquare,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import ActivityLogPanel from "@/components/ActivityLogPanel";
import AIReviewPanel from "@/components/AIReviewPanel";
import LeaderboardPanel from "@/components/LeaderboardPanel";
import MemberPresence from "@/components/MemberPresence";
import ProjectSidebar from "@/components/ProjectSidebar";
import RunPanel from "@/components/RunPanel";
import { useAuth } from "@/hooks/useAuth";
import { createCollabSession, readPresenceUsers, type PresenceUser } from "@/lib/collab";
import { activityService } from "@/services/activityService";
import { executionService } from "@/services/executionService";
import { projectService } from "@/services/projectService";
import { reviewService } from "@/services/reviewService";
import type {
  ActivityEvent,
  AIReview,
  ExecutionRun,
  LeaderboardEntry,
  ProjectRoomInfo,
} from "@/types/api";

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string }; detail?: string | { message?: string } }
      | undefined;

    if (typeof data?.detail === "string") {
      return data.detail;
    }

    if (typeof data?.detail === "object" && data?.detail?.message) {
      return data.detail.message;
    }

    if (data?.error?.message) {
      return data.error.message;
    }
  }

  return fallback;
}

type SaveStatus = "saved" | "unsaved" | "saving";

function outputTitle(run: ExecutionRun | null) {
  if (!run) {
    return "No runs yet";
  }
  return `${run.language} · ${run.status}${run.exit_code !== null ? ` · exit ${run.exit_code}` : ""}${
    run.duration_ms !== null ? ` · ${run.duration_ms} ms` : ""
  }`;
}

function outputText(run: ExecutionRun | null) {
  if (!run) {
    return "Run output will appear here.";
  }

  const text =
    run.combined_output?.trim() ||
    run.stdout?.trim() ||
    run.stderr?.trim() ||
    "Process finished with no output.";

  return text;
}

export default function ProjectPage() {
  const { projectId = "" } = useParams();
  const { accessToken, user } = useAuth();

  const [room, setRoom] = useState<ProjectRoomInfo | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [latestReview, setLatestReview] = useState<AIReview | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<"python" | "javascript">("python");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [collabStatus, setCollabStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting"
  );
  const [currentCode, setCurrentCode] = useState("");
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [reviewCooldownUntil, setReviewCooldownUntil] = useState<number>(0);
  const [reviewStatusText, setReviewStatusText] = useState<string | null>(null);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const collabRef = useRef<ReturnType<typeof createCollabSession> | null>(null);
  const suppressEditorChangeRef = useRef(false);
  const reviewInFlightRef = useRef(false);

  const canEdit = room?.current_user_role !== "viewer";
  const latestRun = runs[0] ?? null;

  const cooldownSeconds = useMemo(() => {
    const diff = Math.ceil((reviewCooldownUntil - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }, [reviewCooldownUntil, isReviewing, latestReview, reviewStatusText]);

  useEffect(() => {
    if (!reviewCooldownUntil) {
      return;
    }

    const timer = window.setInterval(() => {
      if (Date.now() >= reviewCooldownUntil) {
        setReviewCooldownUntil(0);
        setReviewStatusText((prev) =>
          prev?.includes("cooldown") || prev?.includes("429") ? null : prev
        );
      }
    }, 500);

    return () => window.clearInterval(timer);
  }, [reviewCooldownUntil]);

  const syncCodeFromEditor = () => {
    const value = editorRef.current?.getValue() ?? "";
    setCurrentCode(value);
    return value;
  };

  const saveDocument = async (codeOverride?: string) => {
    if (!projectId || !room || !canEdit) {
      return;
    }

    const code = codeOverride ?? syncCodeFromEditor();

    setSaveError(null);
    setSaveStatus("saving");

    try {
      const saved = await projectService.saveDocument(projectId, code);

      setRoom((prev) =>
        prev
          ? {
              ...prev,
              document: {
                ...prev.document,
                plain_text: saved.plain_text,
                last_synced_at: saved.last_synced_at,
              },
            }
          : prev
      );

      setCurrentCode(saved.plain_text);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("unsaved");
      setSaveError(extractErrorMessage(error, "Failed to save code."));
      throw error;
    }
  };

  useEffect(() => {
    if (!projectId || !accessToken) {
      return;
    }

    let active = true;

    const loadRoom = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [roomData, activityData, leaderboardData, runData, reviewData] = await Promise.all([
          projectService.getRoom(projectId),
          activityService.list(projectId, 50),
          activityService.leaderboard(projectId, 20),
          executionService.list(projectId, 20),
          reviewService.list(projectId, 20),
        ]);

        if (!active) {
          return;
        }

        setRoom(roomData);
        setActivities(activityData);
        setLeaderboard(leaderboardData);
        setRuns(runData);
        setLatestReview(reviewData[0] ?? null);
        setSelectedLanguage(roomData.project.language);
        setCurrentCode(roomData.document.plain_text ?? "");
        setSaveStatus("saved");
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadError(extractErrorMessage(error, "Failed to load project."));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadRoom();

    return () => {
      active = false;
    };
  }, [projectId, accessToken]);

  useEffect(() => {
    if (!room || !projectId || !accessToken || !user) {
      return;
    }

    setCollabStatus("connecting");

    const collab = createCollabSession({
      projectId,
      token: accessToken,
      user: {
        name: user.full_name,
        color: user.avatar_color,
      },
      initialText: room.document.plain_text ?? "",
      initialStateBase64: room.document.ydoc_state_base64,
    });

    collabRef.current = collab;

    const handleStatus = (status: "connecting" | "connected" | "disconnected") => {
      setCollabStatus(status);
    };

    const handleAwarenessChange = () => {
      setPresenceUsers(readPresenceUsers(collab.provider.awareness));
    };

    const handleDocUpdate = () => {
      if (suppressEditorChangeRef.current) {
        return;
      }
      const value = collab.text.toString();
      setCurrentCode(value);
      setSaveStatus("unsaved");
    };

    collab.provider.on("status", ({ status }: { status: "connecting" | "connected" | "disconnected" }) =>
      handleStatus(status)
    );
    collab.provider.awareness.on("change", handleAwarenessChange);
    collab.doc.on("update", handleDocUpdate);

    handleAwarenessChange();

    return () => {
      collab.doc.off("update", handleDocUpdate);
      collab.provider.awareness.off("change", handleAwarenessChange);
      bindingRef.current?.destroy();
      bindingRef.current = null;
      collab.destroy();
      collabRef.current = null;
    };
  }, [room, projectId, accessToken, user]);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    const collab = collabRef.current;
    if (!collab) {
      editor.setValue(currentCode || room?.document.plain_text || "");
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(
      collab.text,
      model,
      new Set([editor]),
      collab.provider.awareness
    );

    const initial = collab.text.toString() || room?.document.plain_text || "";
    suppressEditorChangeRef.current = true;
    editor.setValue(initial);
    suppressEditorChangeRef.current = false;
    setCurrentCode(initial);

    editor.onDidChangeModelContent(() => {
      if (suppressEditorChangeRef.current) {
        return;
      }
      setCurrentCode(editor.getValue());
      setSaveStatus("unsaved");
      setSaveError(null);
    });
  };

  const handleRun = async () => {
    if (!projectId || !room) {
      return;
    }

    const code = syncCodeFromEditor();

    setRunError(null);
    setIsRunning(true);

    try {
      if (canEdit) {
        await saveDocument(code);
      }

      const run = await executionService.run(projectId, {
        language: selectedLanguage,
        source_code: code,
      });

      setRuns((prev) => [run, ...prev.filter((item) => item.id !== run.id)]);
      setOutputCollapsed(false);
    } catch (error) {
      setRunError(extractErrorMessage(error, "Failed to run code."));
      setOutputCollapsed(false);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReview = async () => {
    if (!projectId || !room) {
      return;
    }

    if (reviewInFlightRef.current || isReviewing || cooldownSeconds > 0) {
      return;
    }

    reviewInFlightRef.current = true;
    setIsReviewing(true);
    setReviewError(null);
    setReviewStatusText("Requesting live AI review...");

    const code = syncCodeFromEditor();

    try {
      if (canEdit) {
        await saveDocument(code);
      }

      const review = await reviewService.review(projectId, {
        language: selectedLanguage,
        source_code: code,
        collaboration_context: {
          activeCollaborators: presenceUsers.length,
          collabStatus,
        },
      });

      setLatestReview(review);

      if (review.fallback_used) {
        setReviewStatusText("Live provider hit a limit or failed. Fallback review was saved.");
        setReviewCooldownUntil(Date.now() + 15000);
      } else {
        setReviewStatusText(`Live AI review completed via ${review.provider}.`);
        setReviewCooldownUntil(Date.now() + 5000);
      }
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to review code.");
      setReviewError(message);

      if (message.includes("429") || message.toLowerCase().includes("too many requests")) {
        setReviewCooldownUntil(Date.now() + 20000);
        setReviewStatusText("Provider rate limited the request. Cooling down before next attempt.");
      } else {
        setReviewCooldownUntil(Date.now() + 8000);
        setReviewStatusText("Review request failed. Brief cooldown started.");
      }
    } finally {
      reviewInFlightRef.current = false;
      setIsReviewing(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-slate-300">Loading project…</div>;
  }

  if (loadError || !room) {
    return <div className="p-6 text-rose-300">{loadError ?? "Project not found."}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <div>
              <div className="text-lg font-semibold text-white">{room.project.name}</div>
              <div className="text-sm text-slate-400">
                {room.project.description || "Collaborative coding workspace"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              {collabStatus === "connected" ? (
                <>
                  <Wifi size={16} className="text-emerald-300" />
                  <span className="text-emerald-200">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={16} className="text-amber-300" />
                  <span className="text-amber-200">{collabStatus}</span>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              {saveStatus === "saved" && <span className="text-emerald-200">Saved</span>}
              {saveStatus === "unsaved" && <span className="text-amber-200">Unsaved changes</span>}
              {saveStatus === "saving" && <span className="text-sky-200">Saving…</span>}
            </div>

            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning || saveStatus === "saving"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Run code
                </button>

                <button
                  type="button"
                  onClick={() => void saveDocument()}
                  disabled={saveStatus === "saving" || isRunning}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saveStatus === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        {(saveError || runError) && (
          <div className="mx-auto mt-3 flex w-full max-w-[1800px] flex-col gap-2">
            {saveError && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {saveError}
              </div>
            )}
            {runError && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {runError}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-[1800px] flex-1 gap-4 p-4">
        <aside className="flex h-[calc(100vh-112px)] w-[360px] shrink-0 flex-col gap-4 overflow-y-auto pr-1">
          <ProjectSidebar
            project={room.project}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            currentUserRole={room.current_user_role}
          />

          <RunPanel
            runs={runs}
            isRunning={isRunning}
            error={null}
            onRun={handleRun}
          />

          <AIReviewPanel
            review={latestReview}
            isLoading={isReviewing}
            error={reviewError}
            onReview={handleReview}
            statusText={reviewStatusText}
            cooldownSeconds={cooldownSeconds}
          />

          <MemberPresence users={presenceUsers} />
          <ActivityLogPanel events={activities} />
          <LeaderboardPanel entries={leaderboard} />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 shadow-soft">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="text-sm font-medium text-slate-300">
                {selectedLanguage === "python" ? "main.py" : "main.js"}
              </div>
              <div className="text-xs text-slate-500">
                Last synced:{" "}
                {room.document.last_synced_at ? new Date(room.document.last_synced_at).toLocaleString() : "—"}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <Editor
                height="100%"
                theme="vs-dark"
                defaultLanguage={selectedLanguage}
                language={selectedLanguage}
                defaultValue={currentCode}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  automaticLayout: true,
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                  readOnly: !canEdit,
                }}
              />
            </div>
          </section>

          <section
            className={`overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 shadow-soft ${
              outputCollapsed ? "h-[64px]" : "h-[250px]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <TerminalSquare size={16} className="text-indigo-300" />
                <div>
                  <div className="text-sm font-semibold text-white">Output</div>
                  <div className="text-xs text-slate-400">{outputTitle(latestRun)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOutputCollapsed((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
              >
                {outputCollapsed ? (
                  <>
                    <ChevronUp size={14} />
                    Expand
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    Collapse
                  </>
                )}
              </button>
            </div>

            {!outputCollapsed && (
              <div className="h-[calc(250px-57px)] overflow-auto bg-slate-950/90 p-0">
                <pre className="min-h-full whitespace-pre-wrap break-words px-5 py-4 font-mono text-sm leading-6 text-slate-200">
                  {outputText(latestRun)}
                </pre>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}