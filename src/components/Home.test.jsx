import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import Home from "./Home";

// ---------- MOCKS ----------
vi.mock("../firebase", () => ({ auth: {}, db: {}, githubProvider: {} }));

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../components/Helpers/AuthContext", () => ({
    useAuth: () => ({ user: { email: "test@example.com" } }),
}));

// Fake login: always returns a logged-in user
vi.mock("../components/Helpers/AuthContext", () => ({
    useAuth: () => ({ user: { email: "test@example.com" } }),
}));

// Fake child components: tiny versions that show just what we need
vi.mock("./Home/Facts", () => ({
    default: ({ facts, updatelikedCard, userEmail, factsError }) => (
        <div>
            <p>Facts tab for {userEmail}</p>
            {factsError && <p>{factsError}</p>}
            {facts.map((f) => (
                <div key={f.id}>
                    <span>{f.text}</span>
                    <button onClick={() => updatelikedCard(f.id)}>Like {f.id}</button>
                </div>
            ))}
        </div>
    ),
}));

vi.mock("./Home/TrendingFacts", () => ({
    default: () => <div>Trending tab content</div>,
}));
vi.mock("./Home/FactsYouLiked", () => ({
    default: () => <div>Liked tab content</div>,
}));
vi.mock("./Home/Profile", () => ({
    default: () => <div>Profile tab content</div>,
}));

// Helper to build a fake fetch response
const okResponse = (data) => ({
    ok: true,
    json: async () => data,
});

// ---------- TESTS ----------

describe("Home", () => {
    beforeEach(() => {
        // Before EVERY test, replace fetch with a fresh fake
        global.fetch = vi.fn();
    });

    it("fetches facts on load and shows them", async () => {
        // Arrange
        fetch.mockResolvedValueOnce(
            okResponse({
                facts: [
                    { id: 1, text: "Honey never spoils", category: "food" },
                    { id: 2, text: "Octopuses have three hearts", category: "animals" },
                ],
            })
        );

        // Act
        render(<Home />);

        // Assert (findBy... waits until the text appears)
        expect(await screen.findByText("Honey never spoils")).toBeInTheDocument();
        expect(screen.getByText("Octopuses have three hearts")).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledWith("https://factfacts.com/api.php?count=5");
    });

    it("shows an error message when the fetch fails", async () => {
        fetch.mockResolvedValueOnce({ ok: false });

        render(<Home />);

        expect(await screen.findByText("Fetching Facts failed.")).toBeInTheDocument();
    });

    it("switches tabs when clicked", async () => {
        fetch.mockResolvedValueOnce(okResponse({ facts: [] }));
        const user = userEvent.setup();

        render(<Home />);

        await user.click(screen.getByRole("button", { name: "Trending Facts" }));
        expect(screen.getByText("Trending tab content")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Facts You Liked" }));
        expect(screen.getByText("Liked tab content")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Profile Stats" }));
        expect(screen.getByText("Profile tab content")).toBeInTheDocument();
    });

});