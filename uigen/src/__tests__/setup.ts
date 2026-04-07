import { vi } from 'vitest';

// Mock server-only module to prevent errors in tests
vi.mock('server-only', () => ({}));

// Mock Next.js server-side functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock bcrypt for tests
vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));