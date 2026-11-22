import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Never initialize real Firebase in tests
vi.mock("./firebase", () => ({
    auth: { currentUser: null },
    db: {},
    githubProvider: {},
}));

vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn((auth, cb) => {
        cb(null);
        return () => {};
    }),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    GithubAuthProvider: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
}));