use tauri::{AppHandle, Emitter};
use serde_json::json;
use std::process::Command;
use std::path::Path;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Prevent Windows from spawning a new console window for child processes.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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
    detected_default_branch: Option<String>,
    default_branch_candidates: Vec<String>,
    requires_default_branch_choice: bool,
}

#[derive(serde::Serialize)]
struct GitStatusInfo {
    installed: bool,
    version: Option<String>,
    meets_minimum: bool, // >= 2.28
}

fn parse_ls_remote_head_branch(output: &str) -> Option<String> {
    // Expected line: "ref: refs/heads/main\tHEAD"
    for line in output.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("ref:") {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        // parts: ["ref:", "refs/heads/<branch>", "HEAD"]
        if parts[2] != "HEAD" {
            continue;
        }

        if let Some(branch) = parts[1].strip_prefix("refs/heads/") {
            let b = branch.trim();
            if !b.is_empty() {
                return Some(b.to_string());
            }
        }
    }

    None
}

#[tauri::command]
async fn scan_repo(app: AppHandle, path: String) -> Result<RepoInfo, String> {
    let repo_path = Path::new(&path);

    // 验证是否是 Git 仓库
    emit_i18n(&app, "validation.validatingRepo", None);
    run_git_cmd(repo_path, &["rev-parse", "--git-dir"])
        .map_err(|_| "I18N:validation.notGitRepo".to_string())?;

    emit_i18n(&app, "validation.scanningRepo", None);

    // 1. Remote URL
    let remote_url = run_git_cmd(repo_path, &["remote", "get-url", "origin"])
        .unwrap_or_else(|_| "No remote found".to_string())
        .trim()
        .to_string();

    // 2. Detect remote default branch (best effort)
    // Using `ls-remote --symref origin HEAD` to read server-side HEAD -> refs/heads/<branch>
    let head_output = run_git_cmd(repo_path, &["ls-remote", "--symref", "origin", "HEAD"]).unwrap_or_default();
    let detected_default_branch = parse_ls_remote_head_branch(&head_output);

    // 3. Count remote branches/tags
    // We use ls-remote to check the REMOTE state, as that is what we are cleaning.
    // If auth fails, we might just count local? No, plan is about remote.
    // We will try ls-remote.
    let refs_output = run_git_cmd(repo_path, &["ls-remote", "origin"]).unwrap_or_default();
    let mut branch_count = 0;
    let mut tag_count = 0;

    let mut has_main = false;
    let mut has_master = false;
    for line in refs_output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 { continue; }
        let ref_name = parts[1];
        if ref_name.starts_with("refs/heads/") {
            branch_count += 1;
            let branch_name = ref_name.replace("refs/heads/", "");
            if branch_name == "main" {
                has_main = true;
            } else if branch_name == "master" {
                has_master = true;
            }
        } else if ref_name.starts_with("refs/tags/") {
            tag_count += 1;
        }
    }

    // 4. Default branch candidates + whether we need user choice
    let mut default_branch_candidates: Vec<String> = Vec::new();

    if let Some(b) = detected_default_branch.as_ref() {
        default_branch_candidates.push(b.clone());
    }

    if has_main && !default_branch_candidates.iter().any(|b| b == "main") {
        default_branch_candidates.push("main".to_string());
    }
    if has_master && !default_branch_candidates.iter().any(|b| b == "master") {
        default_branch_candidates.push("master".to_string());
    }

    // If we can't determine a single clear choice, ask user to pick/input.
    // Ambiguous case called out explicitly: both main and master exist (and no server-side HEAD info).
    let requires_default_branch_choice =
        detected_default_branch.is_none() && (has_main && has_master || (!has_main && !has_master));

    // 5. Size
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
        detected_default_branch,
        default_branch_candidates,
        requires_default_branch_choice,
    })
}

#[tauri::command]
async fn execute_reset(app: AppHandle, path: String, target_branch: Option<String>) -> Result<(), String> {
    let repo_path = Path::new(&path);
    
    // 1. Get Remote URL from existing repo
    emit_i18n(&app, "tauri.readingConfig", None);
    let remote_url = run_git_cmd(repo_path, &["remote", "get-url", "origin"])
        .map_err(|e| format!("Failed to get remote URL: {}", e))?
        .trim()
        .to_string();
    
    emit_i18n(&app, "tauri.targetRemote", Some(json!({"remote": remote_url})));

    // 2. Get User Config from existing repo
    let user_name = run_git_cmd(repo_path, &["config", "user.name"]).unwrap_or_default().trim().to_string();
    let user_email = run_git_cmd(repo_path, &["config", "user.email"]).unwrap_or_default().trim().to_string();

    // 3. Create Temp Dir for "Clean Slate"
    let temp_dir = std::env::temp_dir().join("git-clean-reboot");
    if temp_dir.exists() {
        std::fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    emit_i18n(&app, "tauri.initializingCleanRepo", None);
    // 4. Init and Config
    run_git_cmd(&temp_dir, &["init"]).map_err(|e| e.to_string())?;
    
    if !user_name.is_empty() {
        run_git_cmd(&temp_dir, &["config", "user.name", &user_name]).ok();
    }
    if !user_email.is_empty() {
        run_git_cmd(&temp_dir, &["config", "user.email", &user_email]).ok();
    }

    // 5. Create Root Commit
    emit_i18n(&app, "tauri.creatingRootCommit", None);
    run_git_cmd(&temp_dir, &["commit", "--allow-empty", "-m", "Chore: repository reset and history cleanup"])
        .map_err(|e| format!("Commit failed: {}", e))?;

    // 6. Add Remote
    run_git_cmd(&temp_dir, &["remote", "add", "origin", &remote_url])
        .map_err(|e| e.to_string())?;

    // 7. Force Push to selected default branch
    let resolved_target = target_branch
        .unwrap_or_default()
        .trim()
        .to_string();
    if resolved_target.is_empty() {
        return Err("Target branch is required".to_string());
    }

    emit_i18n(
        &app,
        "tauri.forcePushing",
        Some(json!({"branch": resolved_target})),
    );
    let refspec = format!("HEAD:{}", resolved_target);
    run_git_cmd(&temp_dir, &["push", "origin", &refspec, "--force"])
        .map_err(|e| format!("Force push failed. Check auth. Error: {}", e))?;

    // 8. Delete all other branches and tags
    // Get remote refs
    emit_i18n(&app, "tauri.fetchingRemoteRefs", None);
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
            if branch_name != resolved_target && branch_name != "HEAD" {
                branches_to_delete.push(branch_name);
            }
        } else if ref_name.starts_with("refs/tags/") {
             let tag_name = ref_name.replace("refs/tags/", "");
             tags_to_delete.push(tag_name);
        }
    }

    emit_i18n(
        &app,
        "tauri.foundBranchesAndTags",
        Some(json!({
            "branches": branches_to_delete.len(),
            "tags": tags_to_delete.len()
        })),
    );

    let mut had_warnings = false;

    // Batch delete branches
    if !branches_to_delete.is_empty() {
        for chunk in branches_to_delete.chunks(20) {
            let mut args = vec!["push", "origin", "--delete"];
            args.extend(chunk.iter().map(|s| s.as_str()));
            
            emit_i18n(
                &app,
                "tauri.deletingBranchBatch",
                Some(json!({"count": chunk.len()})),
            );
            match run_git_cmd(&temp_dir, &args) {
                Ok(_) => {},
                Err(e) => {
                    had_warnings = true;
                    emit_warn_i18n(
                        &app,
                        "tauri.warning.batchDeleteFailed",
                        Some(json!({"error": e})),
                    )
                },
            }
        }
    }

    // Batch delete tags
    if !tags_to_delete.is_empty() {
        for chunk in tags_to_delete.chunks(20) {
             let mut args = vec!["push", "origin", "--delete"];
             args.extend(chunk.iter().map(|s| s.as_str()));
             
             emit_i18n(
                 &app,
                 "tauri.deletingTagBatch",
                 Some(json!({"count": chunk.len()})),
             );
             match run_git_cmd(&temp_dir, &args) {
                Ok(_) => {},
                Err(e) => {
                    had_warnings = true;
                    emit_warn_i18n(
                        &app,
                        "tauri.warning.batchDeleteTagsFailed",
                        Some(json!({"error": e})),
                    )
                },
            }
        }
    }

    if had_warnings {
        emit_error_i18n(&app, "tauri.cleanupCompletedWithWarnings", None);
        // Treat warnings as failure so the frontend doesn't show "success".
        // Return an I18N-prefixed message so UI can translate it.
        return Err("I18N:tauri.cleanupCompletedWithWarnings".to_string());
    }

    emit_i18n(&app, "tauri.cleanupComplete", None);
    Ok(())
}

#[tauri::command]
async fn check_git_status() -> Result<GitStatusInfo, String> {
    use regex::Regex;

    // 尝试执行 git --version
    let mut cmd = std::process::Command::new("git");
    cmd.args(&["--version"]);

    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = match cmd.output() {
        Ok(o) => o,
        Err(_) => {
            // Git 未安装或无法执行
            return Ok(GitStatusInfo {
                installed: false,
                version: None,
                meets_minimum: false,
            });
        }
    };

    if !output.status.success() {
        return Ok(GitStatusInfo {
            installed: false,
            version: None,
            meets_minimum: false,
        });
    }

    let output_str = String::from_utf8_lossy(&output.stdout);

    // 解析版本号: git version X.Y.Z
    let version_str = output_str.trim().to_string();

    // 正则提取主版本号
    let re = Regex::new(r"git version (\d+)\.(\d+)").map_err(|e| e.to_string())?;

    let (major, minor) = if let Some(caps) = re.captures(&output_str) {
        let major: u32 = caps
            .get(1)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);
        let minor: u32 = caps
            .get(2)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);
        (major, minor)
    } else {
        // 解析失败，宽松策略：假设可用
        return Ok(GitStatusInfo {
            installed: true,
            version: Some(version_str),
            meets_minimum: true,
        });
    };

    // 检查 >= 2.28
    let meets_minimum = (major > 2) || (major == 2 && minor >= 28);

    Ok(GitStatusInfo {
        installed: true,
        version: Some(format!("{}.{}", major, minor)),
        meets_minimum,
    })
}

fn emit(app: &AppHandle, msg: &str) {
    let _ = app.emit("log-event", msg);
}

fn emit_i18n(app: &AppHandle, key: &str, args: Option<serde_json::Value>) {
    let payload = match args {
        Some(v) => format!("I18N:{}|{}", key, v.to_string()),
        None => format!("I18N:{}", key),
    };
    emit(app, &payload);
}

fn emit_warn_i18n(app: &AppHandle, key: &str, args: Option<serde_json::Value>) {
    let payload = match args {
        Some(v) => format!("WARN: I18N:{}|{}", key, v.to_string()),
        None => format!("WARN: I18N:{}", key),
    };
    emit(app, &payload);
}

fn emit_error_i18n(app: &AppHandle, key: &str, args: Option<serde_json::Value>) {
    let payload = match args {
        Some(v) => format!("ERROR: I18N:{}|{}", key, v.to_string()),
        None => format!("ERROR: I18N:{}", key),
    };
    emit(app, &payload);
}

fn run_git_cmd(path: &Path, args: &[&str]) -> Result<String, String> {
    // Windows: prevent popping up console window? Tauri handles this usually.
    // Auth: If git needs password, it might hang since we don't provide input.
    // We expect user to have credential helper.
    let mut cmd = Command::new("git");
    cmd.current_dir(path)
        .args(args)
        // Ensure no interactive prompts
        .env("GIT_TERMINAL_PROMPT", "0");

    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
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
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![greet, execute_reset, scan_repo, check_git_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
