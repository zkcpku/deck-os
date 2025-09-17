import { existsSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';

export interface AppConfig {
  defaultFilePath: string;
}

/**
 * Load application configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const defaultFilePath = getDefaultFilePath();
  
  return {
    defaultFilePath,
  };
}

/**
 * Get the default file path from environment or fallback
 */
function getDefaultFilePath(): string {
  const envPath = process.env.DEFAULT_FILE_PATH;
  
  if (envPath) {
    // Resolve relative paths
    const resolvedPath = resolve(envPath);
    
    // Check if the path exists
    if (existsSync(resolvedPath)) {
      return resolvedPath;
    } else {
      console.warn(`Configured DEFAULT_FILE_PATH "${envPath}" does not exist, falling back to home directory`);
    }
  }
  
  // Fallback to home directory
  const homeDir = homedir();
  if (existsSync(homeDir)) {
    return homeDir;
  }
  
  // Ultimate fallback to root
  return '/';
}

/**
 * Validate if a path is allowed for write operations
 */
export function isWriteAllowed(targetPath: string): boolean {
  const homeDir = homedir();
  const cwd = process.cwd();
  const resolvedPath = resolve(targetPath);
  
  // Allow writes to home directory, /tmp, or current working directory
  return (
    resolvedPath.startsWith(homeDir) ||
    resolvedPath.startsWith('/tmp') ||
    resolvedPath.startsWith(cwd)
  );
}

/**
 * Get the singleton config instance
 */
let configInstance: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}