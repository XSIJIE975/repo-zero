export type Step = "connect" | "analyze" | "confirm" | "execute" | "success"

export interface RepoInfo {
  path: string
  remote_url: string
  branch_count: number
  tag_count: number
  size_human: string
  detected_default_branch: string | null
  default_branch_candidates: string[]
  requires_default_branch_choice: boolean
}

export type GitStatus =
  | { status: "checking" }
  | { status: "available"; version: string; meetsMinimum: boolean }
  | { status: "missing" }
