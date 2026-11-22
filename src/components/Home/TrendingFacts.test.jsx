import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
} from "firebase/firestore";

import TrendingFacts from "./TrendingFacts";

// =====================================================================
// MOCKS (paths must match the imports inside TrendingFacts.jsx)
// =====================================================================

vi.mock("firebase/firestore", () => ({
    collection: vi.fn(),
    onSnapshot: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    serverTimestamp: vi.fn(),
}));

vi.mock("../../firebase", () => ({
    db: { name: "fake-db" },
}));

// =====================================================================
// THE ONE NEW IDEA IN THIS FILE: faking onSnapshot
//
// The real onSnapshot subscribes to live updates and calls YOUR function
// every time the data changes. Our fake simply remembers your two
// functions (success + error) in `handlers`. In a test we call
// handlers.onNext(fakeSnapshot) ourselves, which is like saying
// "Firestore just sent new data!".
// =====================================================================

let handlers = {};
const unsubscribe = vi.fn();

// Build a fake Firestore document.
function makeDoc(id, data, hasPendingWrites = false) {
    return { id, data: () => data, metadata: { hasPendingWrites } };
}

// Build a fake snapshot. `changes` is the list of docChanges() entries.
function makeSnapshot(docs, changes = []) {
    return { docs, docChanges: () => changes };
}

// Shortcut for a fact doc: mk("a") gives text "Fact A".
const mk = (id, extra = {}) =>
    makeDoc(id, {
        text: `Fact ${id.toUpperCase()}`,
        category: "science",
        likedBy: [],
        comments: [],
        ...extra,
    });

// Send a snapshot into the component, wrapped in act() so React updates.
function emit(snapshot) {
    act(() => {
        handlers.onNext(snapshot);
    });
}

const ME = "me@example.com";
const OTHER = "other@example.com";

function renderTrending() {
    return render(<TrendingFacts userEmail={ME} />);
}

// =====================================================================
// TESTS
// =====================================================================

describe("TrendingFacts", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        handlers = {};

        collection.mockReturnValue("FACTS_COLLECTION");
        doc.mockReturnValue("FACT_REF");
        serverTimestamp.mockReturnValue("SERVER_TIME");
        arrayUnion.mockImplementation((value) => ({ op: "union", value }));
        arrayRemove.mockImplementation((value) => ({ op: "remove", value }));
        updateDoc.mockResolvedValue(undefined);

        onSnapshot.mockImplementation((_ref, onNext, onError) => {
            handlers = { onNext, onError };
            return unsubscribe; // the real one returns a "stop listening" function
        });

        vi.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        vi.useRealTimers(); // in case a test switched to fake timers
    });

    // ---------------------------------------------------------------
    describe("subscribing", () => {
        it("shows 'Loading...' until the first snapshot arrives", () => {
            renderTrending();
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });

        it("listens to the 'facts' collection once", () => {
            renderTrending();

            expect(collection).toHaveBeenCalledWith({ name: "fake-db" }, "facts");
            expect(onSnapshot).toHaveBeenCalledTimes(1);
            expect(onSnapshot).toHaveBeenCalledWith(
                "FACTS_COLLECTION",
                expect.any(Function),
                expect.any(Function)
            );
        });

        it("stops listening when the component is removed", () => {
            const { unmount } = renderTrending();
            expect(unsubscribe).not.toHaveBeenCalled();

            unmount();

            expect(unsubscribe).toHaveBeenCalledTimes(1);
        });

        it("hides 'Loading...' and shows the facts after the first snapshot", () => {
            renderTrending();
            emit(makeSnapshot([mk("a"), mk("b")]));

            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
            expect(screen.getByText("Fact A")).toBeInTheDocument();
            expect(screen.getByText("Fact B")).toBeInTheDocument();
        });

        it("shows nothing (but no loading text) when there are no facts", () => {
            renderTrending();
            emit(makeSnapshot([]));

            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("shows an error if the listener fails", () => {
            renderTrending();

            act(() => {
                handlers.onError(new Error("permission-denied"));
            });

            expect(screen.getByText("Couldn't load facts.")).toBeInTheDocument();
            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        });

        it("updates the screen when a later snapshot arrives (live updates)", () => {
            renderTrending();
            emit(makeSnapshot([mk("a")]));
            expect(screen.getByRole("button", { name: "Like · 0" })).toBeInTheDocument();

            emit(makeSnapshot([mk("a", { likedBy: [OTHER] }), mk("b")]));

            expect(screen.getByRole("button", { name: "Like · 1" })).toBeInTheDocument();
            expect(screen.getByText("Fact B")).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("sorting", () => {
        const factTexts = () => screen.getAllByText(/^Fact [A-Z]$/).map((el) => el.textContent);

        it("puts the most-liked facts first", () => {
            renderTrending();
            emit(
                makeSnapshot([
                    mk("a", { likedBy: ["1"] }),
                    mk("b", { likedBy: ["1", "2", "3"] }),
                    mk("c", { likedBy: ["1", "2"] }),
                ])
            );

            expect(factTexts()).toEqual(["Fact B", "Fact C", "Fact A"]);
        });

        it("breaks ties alphabetically by id", () => {
            renderTrending();
            emit(makeSnapshot([mk("b"), mk("a"), mk("c")]));

            expect(factTexts()).toEqual(["Fact A", "Fact B", "Fact C"]);
        });

        it("re-sorts when likes change in a later snapshot", () => {
            renderTrending();
            emit(makeSnapshot([mk("a", { likedBy: ["1"] }), mk("b")]));
            expect(factTexts()).toEqual(["Fact A", "Fact B"]);

            emit(makeSnapshot([mk("a", { likedBy: ["1"] }), mk("b", { likedBy: ["1", "2"] })]));

            expect(factTexts()).toEqual(["Fact B", "Fact A"]);
        });
    });

    // ---------------------------------------------------------------
    describe("card contents", () => {
        it("shows the category and text", () => {
            renderTrending();
            emit(makeSnapshot([mk("a")]));

            expect(screen.getByText("science")).toBeInTheDocument();
            expect(screen.getByText("Fact A")).toBeInTheDocument();
        });

        it("shows 'Like · N' when the user has not liked the fact", () => {
            renderTrending();
            emit(makeSnapshot([mk("a", { likedBy: [OTHER, "x@y.com"] })]));

            expect(screen.getByRole("button", { name: "Like · 2" })).toBeInTheDocument();
        });

        it("shows 'Unlike · N' when the user already liked the fact", () => {
            renderTrending();
            emit(makeSnapshot([mk("a", { likedBy: [ME, OTHER] })]));

            expect(screen.getByRole("button", { name: "Unlike · 2" })).toBeInTheDocument();
        });

        it("shows the comment count", () => {
            renderTrending();
            emit(
                makeSnapshot([
                    mk("a", { comments: [{ author: OTHER, text: "hi", createdAt: 1 }] }),
                ])
            );

            expect(screen.getByRole("button", { name: "Comment · 1" })).toBeInTheDocument();
        });

        it("treats missing likedBy / comments fields as empty", () => {
            renderTrending();
            emit(makeSnapshot([makeDoc("z", { text: "Bare fact", category: "misc" })]));

            expect(screen.getByRole("button", { name: "Like · 0" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Comment · 0" })).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("liking and unliking", () => {
        it("likes with arrayUnion and a timestamp", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a")]));

            await user.click(screen.getByRole("button", { name: "Like · 0" }));

            expect(doc).toHaveBeenCalledWith({ name: "fake-db" }, "facts", "a");
            expect(updateDoc).toHaveBeenCalledWith("FACT_REF", {
                likedBy: { op: "union", value: ME },
                updatedAt: "SERVER_TIME",
            });
        });

        it("unlikes with arrayRemove", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a", { likedBy: [ME] })]));

            await user.click(screen.getByRole("button", { name: "Unlike · 1" }));

            expect(updateDoc).toHaveBeenCalledWith("FACT_REF", {
                likedBy: { op: "remove", value: ME },
                updatedAt: "SERVER_TIME",
            });
        });

        it("does not change the label by itself (it waits for the live snapshot)", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a")]));

            await user.click(screen.getByRole("button", { name: "Like · 0" }));
            expect(screen.getByRole("button", { name: "Like · 0" })).toBeInTheDocument();

            // Now Firestore "sends" the updated data:
            emit(makeSnapshot([mk("a", { likedBy: [ME] })]));
            expect(screen.getByRole("button", { name: "Unlike · 1" })).toBeInTheDocument();
        });

        it("shows an error when the like fails", async () => {
            updateDoc.mockRejectedValue(new Error("network down"));
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a")]));

            await user.click(screen.getByRole("button", { name: "Like · 0" }));

            expect(await screen.findByText("Couldn't save your like. Try again.")).toBeInTheDocument();
        });

        it("clears the error on the next attempt", async () => {
            updateDoc
                .mockRejectedValueOnce(new Error("network down"))
                .mockResolvedValueOnce(undefined);
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a")]));

            await user.click(screen.getByRole("button", { name: "Like · 0" }));
            await screen.findByText("Couldn't save your like. Try again.");

            await user.click(screen.getByRole("button", { name: "Like · 0" }));

            await waitFor(() =>
                expect(screen.queryByText("Couldn't save your like. Try again.")).not.toBeInTheDocument()
            );
        });
    });

    // ---------------------------------------------------------------
    describe("highlighting changed facts", () => {
        // Fake timers let us "skip ahead" 2 seconds instantly instead of waiting.
        // (We avoid userEvent and async queries here; they don't mix well with fake timers.)
        const cardOf = (text) => screen.getByText(text).closest("div");

        it("highlights a fact that was modified by someone else, then removes it after 2 seconds", () => {
            vi.useFakeTimers();
            renderTrending();
            const a = mk("a");
            emit(makeSnapshot([a], [{ type: "modified", doc: a }]));

            expect(cardOf("Fact A")).toHaveClass("bg-yellow-100");

            act(() => { vi.advanceTimersByTime(1999); });
            expect(cardOf("Fact A")).toHaveClass("bg-yellow-100"); // still highlighted

            act(() => { vi.advanceTimersByTime(1); });
            expect(cardOf("Fact A")).not.toHaveClass("bg-yellow-100");
        });

        it("only highlights the fact that changed", () => {
            vi.useFakeTimers();
            renderTrending();
            const a = mk("a");
            const b = mk("b");
            emit(makeSnapshot([a, b], [{ type: "modified", doc: a }]));

            expect(cardOf("Fact A")).toHaveClass("bg-yellow-100");
            expect(cardOf("Fact B")).not.toHaveClass("bg-yellow-100");
        });

        it("does not highlight facts that are just 'added' (the first load)", () => {
            renderTrending();
            const a = mk("a");
            emit(makeSnapshot([a], [{ type: "added", doc: a }]));

            expect(cardOf("Fact A")).not.toHaveClass("bg-yellow-100");
        });

        it("does not highlight the user's own local changes (pending writes)", () => {
            renderTrending();
            const a = makeDoc("a", { text: "Fact A", category: "science", likedBy: [], comments: [] }, true);
            emit(makeSnapshot([a], [{ type: "modified", doc: a }]));

            expect(cardOf("Fact A")).not.toHaveClass("bg-yellow-100");
        });
    });

    // ---------------------------------------------------------------
    describe("comments panel", () => {
        it("is closed at first and opens/closes with the Comment button", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a")]));
            expect(screen.queryByPlaceholderText("Enter comment...")).not.toBeInTheDocument();

            const button = screen.getByRole("button", { name: "Comment · 0" });
            await user.click(button);
            expect(screen.getByPlaceholderText("Enter comment...")).toBeInTheDocument();

            await user.click(button);
            expect(screen.queryByPlaceholderText("Enter comment...")).not.toBeInTheDocument();
        });

        it("shows 'No comments yet.' when the fact has no comments", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a")]));

            await user.click(screen.getByRole("button", { name: "Comment · 0" }));

            expect(screen.getByText("No comments yet.")).toBeInTheDocument();
        });

        it("lists existing comments with their authors", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(
                makeSnapshot([
                    mk("a", {
                        comments: [
                            { author: "alice@example.com", text: "Great fact", createdAt: 1 },
                            { author: "bob@example.com", text: "Wow", createdAt: 2 },
                        ],
                    }),
                ])
            );

            await user.click(screen.getByRole("button", { name: "Comment · 2" }));

            expect(screen.getByText("alice@example.com")).toBeInTheDocument();
            expect(screen.getByText("Great fact")).toBeInTheDocument();
            expect(screen.getByText("bob@example.com")).toBeInTheDocument();
            expect(screen.getByText("Wow")).toBeInTheDocument();
            expect(screen.queryByText("No comments yet.")).not.toBeInTheDocument();
        });

        it("opens only the card that was clicked", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a"), mk("b")]));

            await user.click(screen.getAllByRole("button", { name: "Comment · 0" })[0]);

            expect(screen.getAllByPlaceholderText("Enter comment...")).toHaveLength(1);
        });

        it("shows a new comment when the live snapshot delivers it", async () => {
            const user = userEvent.setup();
            renderTrending();
            emit(makeSnapshot([mk("a")]));
            await user.click(screen.getByRole("button", { name: "Comment · 0" }));

            emit(
                makeSnapshot([
                    mk("a", { comments: [{ author: OTHER, text: "Just arrived", createdAt: 5 }] }),
                ])
            );

            expect(screen.getByText("Just arrived")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Comment · 1" })).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("saving a comment", () => {
        async function openPanel(user) {
            renderTrending();
            emit(makeSnapshot([mk("a")]));
            await user.click(screen.getByRole("button", { name: "Comment · 0" }));
        }

        it("saves with arrayUnion", async () => {
            const user = userEvent.setup();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(doc).toHaveBeenCalledWith({ name: "fake-db" }, "facts", "a");
            expect(updateDoc).toHaveBeenCalledWith("FACT_REF", {
                comments: {
                    op: "union",
                    value: { author: ME, text: "Nice one", createdAt: expect.any(Number) },
                },
            });
        });

        it("clears the textarea right away", async () => {
            const user = userEvent.setup();
            await openPanel(user);

            const box = screen.getByPlaceholderText("Enter comment...");
            await user.type(box, "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(box).toHaveValue("");
        });

        it("trims spaces around the comment", async () => {
            const user = userEvent.setup();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "   padded   ");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(updateDoc).toHaveBeenCalledWith("FACT_REF", {
                comments: { op: "union", value: expect.objectContaining({ text: "padded" }) },
            });
        });

        it("does nothing for an empty or spaces-only comment", async () => {
            const user = userEvent.setup();
            await openPanel(user);

            await user.click(screen.getByRole("button", { name: "Save comment" }));
            await user.type(screen.getByPlaceholderText("Enter comment..."), "    ");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(updateDoc).not.toHaveBeenCalled();
        });

        it("gives the text back and shows an error when saving fails", async () => {
            updateDoc.mockRejectedValue(new Error("network down"));
            const user = userEvent.setup();
            await openPanel(user);

            const box = screen.getByPlaceholderText("Enter comment...");
            await user.type(box, "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(await screen.findByText("Couldn't save your comment. Try again.")).toBeInTheDocument();
            expect(box).toHaveValue("Nice one");
        });

        it("clears the old comment error after a successful retry", async () => {
            updateDoc
                .mockRejectedValueOnce(new Error("network down"))
                .mockResolvedValueOnce(undefined);
            const user = userEvent.setup();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));
            await screen.findByText("Couldn't save your comment. Try again.");

            await user.click(screen.getByRole("button", { name: "Save comment" }));

            await waitFor(() =>
                expect(screen.queryByText("Couldn't save your comment. Try again.")).not.toBeInTheDocument()
            );
            expect(updateDoc).toHaveBeenCalledTimes(2);
        });
    });
});
