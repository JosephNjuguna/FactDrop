import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";

import Profile from "./Profile";

// =====================================================================
// MOCKS (paths must match the imports inside Profile.jsx)
// =====================================================================

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("firebase/firestore", () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
    signOut: vi.fn(),
}));

vi.mock("../../firebase", () => ({
    db: { name: "fake-db" },
    auth: { name: "fake-auth" },
}));

// =====================================================================
// HELPERS
// =====================================================================

const ME = "me@example.com";
const OTHER = "other@example.com";

function makeSnapshot(facts) {
    return {
        docs: facts.map(({ id, ...data }) => ({ id, data: () => data })),
    };
}

// Profile makes TWO getDocs calls at the same time:
//   1. getDocs(likedQuery)        -> facts the user liked
//   2. getDocs(collection(...))   -> ALL facts (to find the user's comments)
// Instead of relying on the order of calls, our fake looks at the argument
// it receives and answers accordingly.
function mockFirestoreData({ liked = [], all = [] } = {}) {
    getDocs.mockImplementation(async (arg) =>
        arg === "LIKED_QUERY" ? makeSnapshot(liked) : makeSnapshot(all)
    );
}

// Numbers and labels are in separate <p> tags: <p>3</p><p>liked facts</p>.
// Many numbers could be identical (e.g. two zeros), so we find the label
// and look at the element right before it.
const valueOf = (label) => screen.getByText(label).previousElementSibling;

async function renderProfile(email = ME) {
    render(<Profile userEmail={email} />);
    await screen.findByText("liked facts"); // wait until loading is over
}

// =====================================================================
// TESTS
// =====================================================================

describe("Profile", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        collection.mockReturnValue("FACTS_COLLECTION");
        where.mockReturnValue("WHERE_CLAUSE");
        query.mockReturnValue("LIKED_QUERY");
        mockFirestoreData();
        signOut.mockResolvedValue(undefined);

        vi.spyOn(console, "error").mockImplementation(() => { });
    });

    // ---------------------------------------------------------------
    describe("loading", () => {
        it("shows 'Loading...' while fetching", () => {
            getDocs.mockReturnValue(new Promise(() => { })); // never finishes
            render(<Profile userEmail={ME} />);

            expect(screen.getByText("Loading...")).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument();
        });

        it("hides 'Loading...' once the data arrives", async () => {
            await renderProfile();
            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("fetching", () => {
        it("asks Firestore for facts liked by this user", async () => {
            await renderProfile();

            expect(collection).toHaveBeenCalledWith({ name: "fake-db" }, "facts");
            expect(where).toHaveBeenCalledWith("likedBy", "array-contains", ME);
            expect(query).toHaveBeenCalledWith("FACTS_COLLECTION", "WHERE_CLAUSE");
        });

        it("makes both reads (liked query + all facts)", async () => {
            await renderProfile();

            expect(getDocs).toHaveBeenCalledTimes(2);
            expect(getDocs).toHaveBeenCalledWith("LIKED_QUERY");
            expect(getDocs).toHaveBeenCalledWith("FACTS_COLLECTION");
        });

        it("fetches again when the user email changes", async () => {
            const { rerender } = render(<Profile userEmail="a@example.com" />);
            await screen.findByText("liked facts");
            expect(getDocs).toHaveBeenCalledTimes(2);

            rerender(<Profile userEmail="b@example.com" />);

            await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(4));
            expect(where).toHaveBeenLastCalledWith("likedBy", "array-contains", "b@example.com");
        });
    });

    // ---------------------------------------------------------------
    describe("stats", () => {
        it("shows the signed-in email", async () => {
            await renderProfile();

            expect(screen.getByText("signed in as:")).toBeInTheDocument();
            expect(screen.getByText(ME)).toBeInTheDocument();
        });

        it("shows zeros when the user has no activity", async () => {
            mockFirestoreData({ liked: [], all: [] });
            await renderProfile();

            expect(valueOf("liked facts")).toHaveTextContent("0");
            expect(valueOf("facts commented")).toHaveTextContent("0");
            expect(valueOf("total comments")).toHaveTextContent("0");
        });

        it("counts liked facts", async () => {
            mockFirestoreData({
                liked: [
                    { id: "f1", likedBy: [ME] },
                    { id: "f2", likedBy: [ME] },
                    { id: "f3", likedBy: [ME] },
                ],
            });
            await renderProfile();

            expect(valueOf("liked facts")).toHaveTextContent("3");
        });

        it("counts facts commented on, and total comments, but only the user's own", async () => {
            mockFirestoreData({
                all: [
                    // two of mine + one from someone else  -> counts as 1 fact, 2 comments
                    {
                        id: "f1",
                        comments: [
                            { author: ME, text: "a" },
                            { author: OTHER, text: "b" },
                            { author: ME, text: "c" },
                        ],
                    },
                    // only someone else's comment -> not counted
                    { id: "f2", comments: [{ author: OTHER, text: "d" }] },
                    // one of mine -> counts as 1 fact, 1 comment
                    { id: "f3", comments: [{ author: ME, text: "e" }] },
                    // no comments field at all -> not counted, and must not crash
                    { id: "f4" },
                ],
            });
            await renderProfile();

            expect(valueOf("facts commented")).toHaveTextContent("2");
            expect(valueOf("total comments")).toHaveTextContent("3");
        });

        it("keeps the three stats independent of each other", async () => {
            mockFirestoreData({
                liked: [{ id: "f1", likedBy: [ME] }],
                all: [
                    { id: "f2", comments: [{ author: ME, text: "x" }, { author: ME, text: "y" }] },
                ],
            });
            await renderProfile();

            expect(valueOf("liked facts")).toHaveTextContent("1");
            expect(valueOf("facts commented")).toHaveTextContent("1");
            expect(valueOf("total comments")).toHaveTextContent("2");
        });
    });

    // ---------------------------------------------------------------
    describe("error state", () => {
        it("shows an error message when loading fails", async () => {
            getDocs.mockRejectedValue(new Error("permission-denied"));
            render(<Profile userEmail={ME} />);

            expect(await screen.findByText("Couldn't load your facts.")).toBeInTheDocument();
            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        });

        it("does not show the stats or the sign out button on error", async () => {
            getDocs.mockRejectedValue(new Error("permission-denied"));
            render(<Profile userEmail={ME} />);
            await screen.findByText("Couldn't load your facts.");

            expect(screen.queryByText("liked facts")).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("signing out", () => {
        it("shows a Sign Out button", async () => {
            await renderProfile();
            expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
        });

        it("calls Firebase signOut and then goes to the landing page", async () => {
            const user = userEvent.setup();
            await renderProfile();

            await user.click(screen.getByRole("button", { name: "Sign Out" }));

            expect(signOut).toHaveBeenCalledWith({ name: "fake-auth" });
            await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
        });

        it("waits for signOut to finish before navigating", async () => {
            let resolveSignOut;
            signOut.mockReturnValue(new Promise((resolve) => { resolveSignOut = resolve; }));
            const user = userEvent.setup();
            await renderProfile();

            await user.click(screen.getByRole("button", { name: "Sign Out" }));
            expect(mockNavigate).not.toHaveBeenCalled(); // still waiting

            await act(async () => { resolveSignOut(); });
            expect(mockNavigate).toHaveBeenCalledWith("/");
        });
    });
});
