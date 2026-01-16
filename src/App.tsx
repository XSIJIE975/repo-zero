import { useState, useEffect, useRef } from "react";
import { FolderOpen, Terminal, AlertTriangle, CheckCircle, Loader2, GitBranch, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@/components/ui";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

type Step = "connect" | "analyze" | "confirm" | "execute" | "success";

interface RepoInfo {
  path: string;
  remote_url: string;
  branch_count: number;
  tag_count: number;
  size_human: string;
}

function App() {
  const [step, setStep] = useState<Step>("connect");
  const [repoPath, setRepoPath] = useState<string>("");
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    const unlisten = listen<string>("log-event", (event) => {
      setLogs((prev) => [...prev, event.payload]);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        setRepoPath(selected);
        analyzeRepo(selected);
      }
    } catch (e) {
      console.error("Dialog failed", e);
    }
  };

  const analyzeRepo = async (path: string) => {
    setIsProcessing(true);
    try {
        const info = await invoke<RepoInfo>("scan_repo", { path });
        setRepoInfo(info);
        setStep("analyze");
    } catch (err) {
        console.error(err);
        alert("Failed to analyze repository: " + err);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleExecute = async () => {
    setStep("execute");
    setLogs(["Starting clean up process...", "Please wait..."]);
    try {
        await invoke("execute_reset", { path: repoPath });
        setStep("success");
    } catch (err) {
        setLogs(prev => [...prev, `ERROR: ${err}`]);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center space-y-2">
           <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
             <GitBranch className="w-6 h-6 text-primary" />
           </div>
           <h1 className="text-3xl font-bold tracking-tight">RepoZero</h1>
           <p className="text-muted-foreground">The nuclear option for bloated repositories.</p>
        </div>

        {step === "connect" && (
            <Card>
                <CardHeader>
                    <CardTitle>Select Repository</CardTitle>
                    <CardDescription>Choose the local folder of the git repository you want to reset.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Button size="lg" onClick={handleSelectFolder} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                        {isProcessing ? "Analyzing..." : "Browse Folder"}
                    </Button>
                </CardContent>
            </Card>
        )}

        {step === "analyze" && repoInfo && (
            <Card>
                <CardHeader>
                    <CardTitle>Repository Analysis</CardTitle>
                    <CardDescription>We found the following information.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Remote URL</div>
                        <div className="font-mono text-sm truncate">{repoInfo.remote_url}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Current Size</div>
                        <div className="text-xl font-bold">{repoInfo.size_human}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Branches</div>
                        <div className="text-xl font-bold">{repoInfo.branch_count}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Tags</div>
                        <div className="text-xl font-bold">{repoInfo.tag_count}</div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep("connect")}>Back</Button>
                    <Button onClick={() => setStep("confirm")}>Next: Logic Reset</Button>
                </CardFooter>
            </Card>
        )}

        {step === "confirm" && (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        This action is <strong>irreversible</strong>. It will:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Delete ALL history (commits, logs) forever.</li>
                            <li>Delete ALL branches and tags on remote.</li>
                            <li>Force push a new empty commit to master/main.</li>
                        </ul>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Type <span className="font-mono font-bold select-all">nuclear reset</span> to confirm:
                        </label>
                        <Input 
                            value={confirmText} 
                            onChange={(e) => setConfirmText(e.target.value)} 
                            placeholder="nuclear reset"
                            className="border-destructive/30 focus-visible:ring-destructive"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep("analyze")}>Cancel</Button>
                    <Button 
                        variant="destructive" 
                        disabled={confirmText !== "nuclear reset"}
                        onClick={handleExecute}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Execute Reset
                    </Button>
                </CardFooter>
            </Card>
        )}

        {step === "execute" && (
            <Card className="bg-black text-green-500 border-zinc-800 font-mono">
                <CardHeader className="border-b border-zinc-800 pb-2">
                    <CardTitle className="text-sm flex items-center">
                        <Terminal className="mr-2 h-4 w-4" />
                        Execution Log
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="h-64 overflow-y-auto p-4 space-y-1 text-xs">
                        {logs.map((log, i) => (
                            <div key={i}>&gt; {log}</div>
                        ))}
                         <div ref={logsEndRef} />
                    </div>
                </CardContent>
            </Card>
        )}

        {step === "success" && (
            <Card className="border-green-500/50">
                 <CardHeader>
                    <CardTitle className="text-green-600 flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Operation Successful
                    </CardTitle>
                    <CardDescription>
                        The repository has been successfully reset.
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                    <p className="mb-4">
                        Your remote repository is now clean. Please inform your team to re-clone the repository.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="outline">Start Over</Button>
                 </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}

export default App;
