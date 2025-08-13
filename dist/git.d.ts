export declare function setupGit(opts: {
    repoPath: string;
    branch?: string;
    git?: boolean;
    github?: string | boolean;
    private?: boolean;
    push?: boolean;
}): Promise<void>;
