use tauri::{AppHandle, Emitter};
use std::process::Command;
use std::path::Path;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(serde::Serialize)]
struct RepoInfo {
    path: String,
    remote_url: String,
    branch_count: usize,
    tag_count: usize,
    size_human: String,
}

#[tauri::command]
async fn scan_repo(path: String) -> Result<RepoInfo, String> {
    let repo_path = Path::new(&path);

    // 1. Remote URL
    let remote_url = run_git_cmd(repo_path, &["remote", "get-url", "origin"])
        .unwrap_or_else(|_| "No remote found".to_string())
        .trim()
        .to_string();

    // 2. Count remote branches/tags
    // We use ls-remote to check the REMOTE state, as that is what we are cleaning.
    // If auth fails, we might just count local? No, plan is about remote.
    // We will try ls-remote.
    let refs_output = run_git_cmd(repo_path, &["ls-remote", "origin"]).unwrap_or_default();
    let mut branch_count = 0;
    let mut tag_count = 0;
    for line in refs_output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 { continue; }
        let ref_name = parts[1];
        if ref_name.starts_with("refs/heads/") {
            branch_count += 1;
        } else if ref_name.starts_with("refs/tags/") {
            tag_count += 1;
        }
    }

    // 3. Size
    // git count-objects -vH
    let size_output = run_git_cmd(repo_path, &["count-objects", "-vH"]).unwrap_or_default();
    let size_human = size_output.lines()
        .find(|l| l.starts_with("size-pack:"))
        .map(|l| l.replace("size-pack:", "").trim().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    Ok(RepoInfo {
        path,
        remote_url,
        branch_count,
        tag_count,
        size_human: format!("~{} (pack)", size_human),
    })
}

#[tauri::command]
async fn execute_reset(app: AppHandle, path: String) -> Result<(), String> {
    let repo_path = Path::new(&path);
    
    // 1. Get Remote URL from existing repo
    emit(&app, "Reading configuration...");
    let remote_url = run_git_cmd(repo_path, &["remote", "get-url", "origin"])
        .map_err(|e| format!("Failed to get remote URL: {}", e))?
        .trim()
        .to_string();
    
    emit(&app, &format!("Target Remote: {}", remote_url));

    // 2. Get User Config from existing repo
    let user_name = run_git_cmd(repo_path, &["config", "user.name"]).unwrap_or_default().trim().to_string();
    let user_email = run_git_cmd(repo_path, &["config", "user.email"]).unwrap_or_default().trim().to_string();

    // 3. Create Temp Dir for "Clean Slate"
    let temp_dir = std::env::temp_dir().join("git-clean-reboot");
    if temp_dir.exists() {
        std::fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    emit(&app, "Initializing clean repository...");
    // 4. Init and Config
    run_git_cmd(&temp_dir, &["init"]).map_err(|e| e.to_string())?;
    
    if !user_name.is_empty() {
        run_git_cmd(&temp_dir, &["config", "user.name", &user_name]).ok();
    }
    if !user_email.is_empty() {
        run_git_cmd(&temp_dir, &["config", "user.email", &user_email]).ok();
    }

    // 5. Create Root Commit
    emit(&app, "Creating root commit...");
    run_git_cmd(&temp_dir, &["commit", "--allow-empty", "-m", "Chore: repository reset and history cleanup"])
        .map_err(|e| format!("Commit failed: {}", e))?;

    // 6. Add Remote
    run_git_cmd(&temp_dir, &["remote", "add", "origin", &remote_url])
        .map_err(|e| e.to_string())?;

    // 7. Force Push Master/Main
    // Try 'main' first, then 'master'
    emit(&app, "Force pushing to origin...");
    
    // Check what the default branch is or just push HEAD:main and HEAD:master?
    // Safer to just push to 'main' and 'master' to be sure, or detect.
    // Let's assume 'main' is the target, if it fails try 'master'.
    let push_res = run_git_cmd(&temp_dir, &["push", "origin", "HEAD:main", "--force"]);
    if push_res.is_err() {
         emit(&app, "Push to main failed, trying master...");
         run_git_cmd(&temp_dir, &["push", "origin", "HEAD:master", "--force"])
            .map_err(|e| format!("Force push failed. Check auth. Error: {}", e))?;
    }

    // 8. Delete all other branches and tags
    // Get remote refs
    emit(&app, "Fetching remote refs for cleanup...");
    let refs_output = run_git_cmd(repo_path, &["ls-remote", "origin"]).unwrap_or_default(); // read from original repo for auth context if needed? NO, use temp is better or original is fine.
    // actually ls-remote might fail if auth is needed. 
    // The original repo has the auth context usually.
    
    let lines: Vec<&str> = refs_output.lines().collect();
    let mut branches_to_delete = Vec::new();
    let mut tags_to_delete = Vec::new();

    for line in lines {
        // format: <sha> <ref>
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 { continue; }
        let ref_name = parts[1];

        if ref_name.starts_with("refs/heads/") {
            let branch_name = ref_name.replace("refs/heads/", "");
            if branch_name != "main" && branch_name != "master" && branch_name != "HEAD" {
                branches_to_delete.push(branch_name);
            }
        } else if ref_name.starts_with("refs/tags/") {
             let tag_name = ref_name.replace("refs/tags/", "");
             tags_to_delete.push(tag_name);
        }
    }

    emit(&app, &format!("Found {} branches and {} tags to delete.", branches_to_delete.len(), tags_to_delete.len()));

    // Batch delete branches
    if !branches_to_delete.is_empty() {
        for chunk in branches_to_delete.chunks(20) {
            let mut args = vec!["push", "origin", "--delete"];
            args.extend(chunk.iter().map(|s| s.as_str()));
            
            emit(&app, &format!("Deleting batch of {} branches...", chunk.len()));
            match run_git_cmd(&temp_dir, &args) {
                Ok(_) => {},
                Err(e) => emit(&app, &format!("Warning: Batch delete failed: {}", e)),
            }
        }
    }

    // Batch delete tags
    if !tags_to_delete.is_empty() {
        for chunk in tags_to_delete.chunks(20) {
             let mut args = vec!["push", "origin", "--delete"];
             args.extend(chunk.iter().map(|s| s.as_str()));
             
             emit(&app, &format!("Deleting batch of {} tags...", chunk.len()));
             match run_git_cmd(&temp_dir, &args) {
                Ok(_) => {},
                Err(e) => emit(&app, &format!("Warning: Batch delete tags failed: {}", e)),
            }
        }
    }
    
    emit(&app, "Cleanup complete.");
    Ok(())
}

fn emit(app: &AppHandle, msg: &str) {
    let _ = app.emit("log-event", msg);
}

fn run_git_cmd(path: &Path, args: &[&str]) -> Result<String, String> {
    // Windows: prevent popping up console window? Tauri handles this usually.
    // Auth: If git needs password, it might hang since we don't provide input.
    // We expect user to have credential helper.
    let output = Command::new("git")
        .current_dir(path)
        .args(args)
        // Ensure no interactive prompts
        .env("GIT_TERMINAL_PROMPT", "0") 
        .output()
        .map_err(|e| format!("Failed to execute process: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(err)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, execute_reset, scan_repo])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
