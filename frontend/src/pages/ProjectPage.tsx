import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import * as Monaco from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import axios from "axios";
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import ActivityLogPanel from "@/components/ActivityLogPanel";
import AIReviewPanel from "@/components/AIReviewPanel";
import LeaderboardPanel from "@/components/LeaderboardPanel";
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

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

type SaveStatus = "saved" | "unsaved" | "saving";

function outputTitle(run: ExecutionRun | null) {
  if (!run) {
    return "No runs yet";
  }

  return `${run.language} · ${run.status}${
    run.exit_code !== null ? ` · exit ${run.exit_code}` : ""
  }${run.duration_ms !== null ? ` · ${run.duration_ms} ms` : ""}`;
}

function outputText(run: ExecutionRun | null) {
  if (!run) {
    return "Run output will appear here.";
  }

  return (
    run.combined_output?.trim() ||
    run.stdout?.trim() ||
    run.stderr?.trim() ||
    "Process finished with no output."
  );
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
  const [sourceCode, setSourceCode] = useState("");
  const sourceCodeRef = useRef("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const [pageError, setPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewStatusText, setReviewStatusText] = useState<string | null>(null);
  const [collabStatus, setCollabStatus] = useState<"connected" | "disconnected">("disconnected");

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const collabRef = useRef<ReturnType<typeof createCollabSession> | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const latestRun = runs[0] ?? null;

  const setLiveSourceCode = useCallback((nextCode: string) => {
    sourceCodeRef.current = nextCode;
    setSourceCode(nextCode);
  }, []);

  const getLiveSourceCode = useCallback(() => {
    const collab = collabRef.current;
    if (collab) {
      return collab.text.toString();
    }

    const editorValue = editorRef.current?.getValue();
    if (typeof editorValue === "string") {
      return editorValue;
    }

    return sourceCodeRef.current;
  }, []);

  const refreshProjectMeta = useCallback(async () => {
    if (!projectId) {
      return;
    }
    const freshRoom = await projectService.getRoom(projectId);
    setRoom(freshRoom);
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !accessToken || !user) {
      return;
    }

    let isMounted = true;

    async function bootstrap() {
      setIsLoading(true);
      setPageError(null);

      try {
        const [roomData, activityData, leaderboardData, runData, reviewData] = await Promise.all([
          projectService.getRoom(projectId),
          activityService.list(projectId),
          activityService.leaderboard(projectId),
          executionService.list(projectId),
          reviewService.list(projectId),
        ]);

        if (!isMounted) {
          return;
        }

        setRoom(roomData);
        setSelectedLanguage(roomData.project.language);
        setLiveSourceCode(roomData.document.plain_text ?? "");
        setActivities(activityData);
        setLeaderboard(leaderboardData);
        setRuns(runData);
        setLatestReview(reviewData[0] ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setPageError(extractErrorMessage(error, "Unable to open the project."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [projectId, accessToken, user, setLiveSourceCode]);

  const flushSave = useCallback(async () => {
    if (!projectId) {
      return;
    }

    const plainText = getLiveSourceCode();
    setSaveStatus("saving");
    setSaveError(null);

    try {
      const saved = await projectService.saveDocument(projectId, plainText);
      setLiveSourceCode(saved.plain_text);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("unsaved");
      setSaveError(extractErrorMessage(error, "Unable to save project code."));
      throw error;
    }
  }, [getLiveSourceCode, projectId, setLiveSourceCode]);

  const scheduleAutosave = useCallback(() => {
    if (!projectId) {
      return;
    }

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("unsaved");

    saveTimeoutRef.current = window.setTimeout(() => {
      void flushSave();
    }, 800);
  }, [flushSave, projectId]);

  useEffect(() => {
    if (!room || !accessToken || !user) {
      return;
    }

    const collab = createCollabSession({
      projectId: room.project.id,
      wsUrl: room.collab_ws_url,
      token: accessToken,
      initialPlainText: room.document.plain_text ?? "",
      initialStateBase64: room.document.ydoc_state_base64,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        avatar_color: user.avatar_color,
      },
    });

    collabRef.current = collab;
    setCollabStatus("connected");
    setLiveSourceCode(collab.text.toString());

    const syncPresence = () => {
      setPresenceUsers(readPresenceUsers(collab.awareness));
    };

    const syncText = () => {
      setLiveSourceCode(collab.text.toString());
    };

    const handleOpen = () => setCollabStatus("connected");
    const handleDisconnect = () => setCollabStatus("disconnected");
    const handleClose = () => setCollabStatus("disconnected");

    collab.text.observe(syncText);
    collab.awareness.on("change", syncPresence);
    collab.provider.on("open", handleOpen);
    collab.provider.on("disconnect", handleDisconnect);
    collab.provider.on("close", handleClose);

    syncPresence();
    syncText();

    return () => {
      collab.text.unobserve(syncText);
      collab.awareness.off("change", syncPresence);
      collab.provider.off("open", handleOpen);
      collab.provider.off("disconnect", handleDisconnect);
      collab.provider.off("close", handleClose);
      bindingRef.current?.destroy();
      bindingRef.current = null;
      collab.destroy();
      collabRef.current = null;
      setPresenceUsers([]);
      setCollabStatus("disconnected");
    };
  }, [room, accessToken, user, setLiveSourceCode]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    const collab = collabRef.current;
    const model = editor.getModel();

    if (!collab || !model) {
      return;
    }

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(
      collab.text,
      model,
      new Set([editor]),
      collab.awareness
    );

    editor.onDidChangeModelContent(() => {
      const nextValue = editor.getValue();
      setLiveSourceCode(nextValue);
      scheduleAutosave();
    });

    monaco.editor.setModelLanguage(model, selectedLanguage);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const model = editor.getModel();
    if (!model) {
      return;
    }
    editor.updateOptions({ readOnly: room?.current_user_role === "viewer" });
  }, [room?.current_user_role]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    Monaco.editor.setModelLanguage(model, selectedLanguage);
  }, [selectedLanguage]);

  const handleRun = async () => {
    if (!projectId) {
      return;
    }

    setIsRunning(true);
    setRunError(null);

    try {
      if (saveStatus === "unsaved" || saveStatus === "saving") {
        await flushSave();
      }

      const liveCode = getLiveSourceCode();

      const run = await executionService.run(projectId, {
        source_code: liveCode,
        language: selectedLanguage,
      });

      setRuns((prev) => [run, ...prev.filter((item) => item.id !== run.id)]);

      const [runData, activityData] = await Promise.all([
        executionService.list(projectId),
        activityService.list(projectId),
      ]);

      setRuns(runData);
      setActivities(activityData);
    } catch (error) {
      setRunError(extractErrorMessage(error, "Unable to run project code."));
    } finally {
      setIsRunning(false);
    }
  };

  const handleReview = async () => {
    if (!projectId || !room) {
      return;
    }

    setIsReviewing(true);
    setReviewError(null);
    setReviewStatusText("AI review in progress…");

    try {
      const liveCode = getLiveSourceCode();

      const review = await reviewService.review(projectId, {
        source_code: liveCode,
        language: selectedLanguage,
        collaboration_context: {
          projectName: room.project.name,
          activeCollaborators: presenceUsers.length,
        },
      });

      setLatestReview(review);

      const [activityData] = await Promise.all([activityService.list(projectId)]);
      setActivities(activityData);
      setReviewStatusText(review.fallback_used ? "Fallback review completed." : "AI review completed.");
    } catch (error) {
      setReviewError(extractErrorMessage(error, "Unable to run AI review."));
      setReviewStatusText(null);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAddMember = async (payload: { email: string; role: "editor" | "viewer" }) => {
    if (!projectId || !room) {
      return;
    }

    const updatedProject = await projectService.addMember(projectId, payload);
    setRoom((current) =>
      current
        ? {
            ...current,
            project: updatedProject,
          }
        : current
    );

    const [activityData] = await Promise.all([activityService.list(projectId)]);
    setActivities(activityData);
  };

  const handleUpdateMemberRole = async (userId: string, role: "editor" | "viewer") => {
    if (!projectId || !room) {
      return;
    }

    const updatedProject = await projectService.updateMemberRole(projectId, userId, { role });
    setRoom((current) =>
      current
        ? {
            ...current,
            project: updatedProject,
          }
        : current
    );

    const [activityData] = await Promise.all([activityService.list(projectId)]);
    setActivities(activityData);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) {
      return;
    }

    await projectService.removeMember(projectId, userId);
    await refreshProjectMeta();

    const [activityData] = await Promise.all([activityService.list(projectId)]);
    setActivities(activityData);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-slate-300">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-5 py-4">
          <Loader2 className="animate-spin" size={18} />
          Loading workspace…
        </div>
      </div>
    );
  }

  if (pageError || !room) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-200">
          {pageError ?? "Project data is unavailable."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-slate-900/80 px-5 py-4 shadow-soft">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">{room.project.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
            {collabStatus === "connected" ? (
              <Wifi size={16} className="text-emerald-300" />
            ) : (
              <WifiOff size={16} className="text-amber-300" />
            )}
            {collabStatus}
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
            <Save size={16} className="text-indigo-300" />
            {saveStatus}
          </div>
        </div>
      </div>

      {saveError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {saveError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <ProjectSidebar
            project={room.project}
            currentUserRole={room.current_user_role}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onAddMember={handleAddMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onRemoveMember={handleRemoveMember}
            isSaving={saveStatus === "saving"}
          />

          <ActivityLogPanel events={activities} />
          <LeaderboardPanel entries={leaderboard} />
          <AIReviewPanel
            review={latestReview}
            isLoading={isReviewing}
            error={reviewError}
            onReview={handleReview}
            statusText={reviewStatusText}
          />
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Editor</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Code editor is primary on the right. Tools and collaboration menus stay on the left.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
                <Sparkles size={15} className="text-violet-300" />
                {room.current_user_role === "viewer" ? "Read only" : "Editable"}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
              <Editor
                height="70vh"
                language={selectedLanguage}
                theme="vs-dark"
                value={sourceCode}
                onMount={handleEditorMount}
                onChange={(value) => {
                  const nextValue = value ?? "";
                  setLiveSourceCode(nextValue);
                  scheduleAutosave();
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  automaticLayout: true,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </section>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <RunPanel
              runs={runs}
              isRunning={isRunning}
              language={selectedLanguage}
              error={runError}
              onRun={handleRun}
            />

            <section className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Execution output</h3>
                <div className="text-xs text-slate-400">{outputTitle(latestRun)}</div>
              </div>

              <pre className="mt-4 min-h-[320px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm leading-6 text-slate-100">
                {outputText(latestRun)}
              </pre>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}