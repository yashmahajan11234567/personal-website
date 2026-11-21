export interface TowerCommit {
  sha: string;
  message: string;
  date: string;
  url: string;
}
export interface TowerBranch {
  name: string;
  url: string;
  total_commits: number;
  commits_displayed: number;
  commits: TowerCommit[];
}
export interface TowerRepo {
  name: string;
  url: string;
  description: string;
  is_fork: boolean;
  color: string;
  branches: TowerBranch[];
}
export interface TowerData {
  generated_at: string;
  user: string;
  commits_per_branch_limit: number;
  totals: { repositories: number; branches: number; commits_displayed: number };
  repositories: TowerRepo[];
}
