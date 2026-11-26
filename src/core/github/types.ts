export interface TreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  size?: number
  sha: string
}

export interface RepoMeta {
  owner: string
  name: string
  fullName: string
  htmlUrl: string
  description: string | null
  language: string | null
  stars: number
  license: string | null
  archived: boolean
  defaultBranch: string
}

export interface CommitInfo {
  sha: string
  shortSha: string
  date: string
  message: string
}

export interface RepoTree {
  entries: TreeEntry[]
  truncated: boolean
}
