import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConversationMode } from '../types';

export type SavedPlaybook = {
  id: string;
  title: string;
  mode: ConversationMode;
  description: string;
  goal: string;
  notes: string;
  pinned: boolean;
  createdAt: string;
};

const CUSTOM_PLAYBOOK_KEY = 'wingman:customPlaybooks';
const MAX_PLAYBOOKS = 12;

export async function loadCustomPlaybooks(limit = MAX_PLAYBOOKS): Promise<SavedPlaybook[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_PLAYBOOK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPlaybook[];
    return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export async function saveCustomPlaybooks(playbooks: SavedPlaybook[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_PLAYBOOK_KEY, JSON.stringify(playbooks.slice(0, MAX_PLAYBOOKS))).catch(() => {});
}

export async function appendCustomPlaybook(playbook: SavedPlaybook): Promise<SavedPlaybook[]> {
  const existing = await loadCustomPlaybooks(MAX_PLAYBOOKS - 1);
  const next = [playbook, ...existing].slice(0, MAX_PLAYBOOKS);
  await saveCustomPlaybooks(next);
  return next;
}
