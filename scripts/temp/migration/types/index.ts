export interface ProfileMatch {
  id: string;
  email: string | null;
  phone: number | null;
  full_name: string | null;
}

export interface FindProfileResult {
  type: 'not_found' | 'found' | 'conflict';
  profile?: ProfileMatch;
  profiles?: ProfileMatch[];
}