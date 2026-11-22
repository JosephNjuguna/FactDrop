import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    arrayUnion,
} from "firebase/firestore";

import FactsYouLiked from "./FactsYouLiked";

// =====================================================================
// MOCKS (paths must match the imports inside FactsYouLiked.jsx)
// =====================================================================

// The component also imports `query` and `where` (unused), so the fake
// module must export them too or the import would fail.
vi.mock("firebase/firestore", () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    doc: vi.fn(),
    updateDoc: vi.fn(),
    arrayUnion: vi.fn(),
}));

vi.mock("../../firebase", () => ({
    db: { name: "fake-db" },
}));

// =====================================================================
// HELPERS
// =====================================================================

const ME = "me@example.com";
const OTHER = "other@example.com";

// Real Firestore gives you a snapshot with `.docs`; each doc has `.id` and `.data()`.
// This builds a fake one from plain objects.
function makeSnapshot(facts) {
    return {
        docs: facts.map(({ id, ...data }) => ({ id, data: () => data })),
    };
}

const likedByMe = {
    id: "f1",
    text: "Honey never spoils",
    category: "food",
    likedBy: [ME, OTHER],
    comments: [],
};

const likedByOthers = {
    id: "f2",
    text: "Bananas are berries",
    category: "food",
    likedBy: [OTHER],
    comments: [{ author: OTHER, text: "cool", createdAt: 1 }],
};

const commentedByMe = {
    id: "f3",
    text: "Octopuses have three hearts",
    category: "animals",
    likedBy: [], // NOTE: must be present, see the it.todo at the bottom
    comments: [{ author: ME, text: "wow", createdAt: 2 }],
};

function renderLiked(email = ME) {
    return render(<FactsYouLiked userEmail={email} />);
}

// =====================================================================
// TESTS
// =====================================================================

describe("FactsYouLiked", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        collection.mockReturnValue("FACTS_COLLECTION");
        doc.mockReturnValue("FACT_REF");
        arrayUnion.mockImplementation((value) => ({ op: "union", value }));
        getDocs.mockResolvedValue(makeSnapshot([likedByMe]));
        updateDoc.mockResolvedValue(undefined);

        vi.spyOn(console, "error").mockImplementation(() => { });
    });

    // ---------------------------------------------------------------
    describe("loading and fetching", () => {
        it("shows 'Loading...' while the data is being fetched", () => {
            getDocs.mockReturnValue(new Promise(() => { })); // never finishes
            renderLiked();

            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });

        it("fetches the 'facts' collection", async () => {
            renderLiked();
            await screen.findByText("Honey never spoils");

            expect(collection).toHaveBeenCalledWith({ name: "fake-db" }, "facts");
            expect(getDocs).toHaveBeenCalledWith("FACTS_COLLECTION");
        });

        it("hides 'Loading...' once the data arrives", async () => {
            renderLiked();
            await screen.findByText("Honey never spoils");

            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        });

        it("does not fetch until it has a user email", () => {
            // Render directly: our renderLiked() helper has a default email,
            // so passing undefined to it would silently use ME instead.
            render(<FactsYouLiked userEmail={undefined} />);

            expect(getDocs).not.toHaveBeenCalled();
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });

        it("fetches again when the user email changes", async () => {
            // Start with ME, because likedByMe is liked by ME (so the fact shows up).
            const { rerender } = renderLiked(ME);
            await screen.findByText("Honey never spoils");
            expect(getDocs).toHaveBeenCalledTimes(1);

            rerender(<FactsYouLiked userEmail="b@example.com" />);

            await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(2));
        });
    });

    // ---------------------------------------------------------------
    describe("which facts are shown", () => {
        beforeEach(() => {
            getDocs.mockResolvedValue(makeSnapshot([likedByMe, likedByOthers, commentedByMe]));
        });

        it("shows facts the user liked", async () => {
            renderLiked();
            expect(await screen.findByText("Honey never spoils")).toBeInTheDocument();
        });

        it("shows facts the user only commented on", async () => {
            renderLiked();
            expect(await screen.findByText("Octopuses have three hearts")).toBeInTheDocument();
        });

        it("hides facts the user neither liked nor commented on", async () => {
            renderLiked();
            await screen.findByText("Honey never spoils");

            expect(screen.queryByText("Bananas are berries")).not.toBeInTheDocument();
        });

        it("shows the category and the like count on each card", async () => {
            renderLiked();
            await screen.findByText("Honey never spoils");

            expect(screen.getByText("food")).toBeInTheDocument();
            expect(screen.getByText("Likes · 2")).toBeInTheDocument();
            expect(screen.getByText("animals")).toBeInTheDocument();
            expect(screen.getByText("Likes · 0")).toBeInTheDocument();
        });

        it("shows the comment count on each card's button", async () => {
            renderLiked();
            await screen.findByText("Honey never spoils");

            expect(screen.getByRole("button", { name: "Comment · 0" })).toBeInTheDocument(); // honey
            expect(screen.getByRole("button", { name: "Comment · 1" })).toBeInTheDocument(); // octopus
        });

        it("treats a fact with no comments field as having 0 comments", async () => {
            getDocs.mockResolvedValue(
                makeSnapshot([{ id: "f9", text: "No comments field", category: "x", likedBy: [ME] }])
            );
            renderLiked();

            expect(await screen.findByRole("button", { name: "Comment · 0" })).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("empty and error states", () => {
        it("shows a friendly message when nothing matches", async () => {
            getDocs.mockResolvedValue(makeSnapshot([likedByOthers]));
            renderLiked();

            expect(
                await screen.findByText(/haven't liked or commented on any facts yet/i)
            ).toBeInTheDocument();
        });

        it("shows a friendly message when the collection is empty", async () => {
            getDocs.mockResolvedValue(makeSnapshot([]));
            renderLiked();

            expect(
                await screen.findByText(/haven't liked or commented on any facts yet/i)
            ).toBeInTheDocument();
        });

        it("shows an error when loading fails", async () => {
            getDocs.mockRejectedValue(new Error("permission-denied"));
            renderLiked();

            expect(await screen.findByText("Couldn't load your facts.")).toBeInTheDocument();
            expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("comments panel", () => {
        const factWithComments = {
            ...likedByMe,
            comments: [
                { author: "alice@example.com", text: "Great fact", createdAt: 10 },
                { author: "bob@example.com", text: "I did not know that", createdAt: 20 },
            ],
        };

        it("is closed at first", async () => {
            renderLiked();
            await screen.findByText("Honey never spoils");

            expect(screen.queryByPlaceholderText("Enter comment...")).not.toBeInTheDocument();
        });

        it("opens when the Comment button is clicked", async () => {
            const user = userEvent.setup();
            renderLiked();
            await screen.findByText("Honey never spoils");

            await user.click(screen.getByRole("button", { name: "Comment · 0" }));

            expect(screen.getByPlaceholderText("Enter comment...")).toBeInTheDocument();
        });

        it("closes again when the button is clicked a second time", async () => {
            const user = userEvent.setup();
            renderLiked();
            await screen.findByText("Honey never spoils");

            const button = screen.getByRole("button", { name: "Comment · 0" });
            await user.click(button);
            await user.click(button);

            expect(screen.queryByPlaceholderText("Enter comment...")).not.toBeInTheDocument();
        });

        it("shows 'No comments yet.' when there are none", async () => {
            const user = userEvent.setup();
            renderLiked();
            await screen.findByText("Honey never spoils");

            await user.click(screen.getByRole("button", { name: "Comment · 0" }));

            expect(screen.getByText("No comments yet.")).toBeInTheDocument();
        });

        it("lists existing comments with their authors", async () => {
            getDocs.mockResolvedValue(makeSnapshot([factWithComments]));
            const user = userEvent.setup();
            renderLiked();

            await user.click(await screen.findByRole("button", { name: "Comment · 2" }));

            expect(screen.getByText("alice@example.com")).toBeInTheDocument();
            expect(screen.getByText("Great fact")).toBeInTheDocument();
            expect(screen.getByText("bob@example.com")).toBeInTheDocument();
            expect(screen.getByText("I did not know that")).toBeInTheDocument();
            expect(screen.queryByText("No comments yet.")).not.toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("saving a comment", () => {
        async function openPanel(user) {
            await screen.findByText("Honey never spoils");
            await user.click(screen.getByRole("button", { name: "Comment · 0" }));
        }

        it("saves to Firestore using arrayUnion", async () => {
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(doc).toHaveBeenCalledWith({ name: "fake-db" }, "facts", "f1");
            expect(updateDoc).toHaveBeenCalledWith("FACT_REF", {
                comments: {
                    op: "union",
                    value: { author: ME, text: "Nice one", createdAt: expect.any(Number) },
                },
            });
        });

        it("shows the new comment immediately and updates the count", async () => {
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(screen.getByText("Nice one")).toBeInTheDocument();
            expect(screen.getByText(ME)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Comment · 1" })).toBeInTheDocument();
            expect(screen.queryByText("No comments yet.")).not.toBeInTheDocument();
        });

        it("clears the textarea after saving", async () => {
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            const box = screen.getByPlaceholderText("Enter comment...");
            await user.type(box, "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(box).toHaveValue("");
        });

        it("trims spaces around the comment", async () => {
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "   padded   ");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(updateDoc).toHaveBeenCalledWith(
                "FACT_REF",
                { comments: { op: "union", value: expect.objectContaining({ text: "padded" }) } }
            );
        });

        it("does nothing when the textarea is empty", async () => {
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(updateDoc).not.toHaveBeenCalled();
            expect(screen.getByRole("button", { name: "Comment · 0" })).toBeInTheDocument();
        });

        it("does nothing when the textarea only has spaces", async () => {
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "     ");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(updateDoc).not.toHaveBeenCalled();
        });

        it("undoes the comment, restores the text and shows an error when saving fails", async () => {
            updateDoc.mockRejectedValue(new Error("network down"));
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            const box = screen.getByPlaceholderText("Enter comment...");
            await user.type(box, "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));

            expect(await screen.findByText("Couldn't save your comment. Try again.")).toBeInTheDocument();
            expect(box).toHaveValue("Nice one"); // text given back to the user
            expect(screen.getByText("No comments yet.")).toBeInTheDocument(); // comment removed
            expect(screen.getByRole("button", { name: "Comment · 0" })).toBeInTheDocument();
        });

        it("clears the old error when the user tries again", async () => {
            updateDoc
                .mockRejectedValueOnce(new Error("network down"))
                .mockResolvedValueOnce(undefined);
            const user = userEvent.setup();
            renderLiked();
            await openPanel(user);

            await user.type(screen.getByPlaceholderText("Enter comment..."), "Nice one");
            await user.click(screen.getByRole("button", { name: "Save comment" }));
            await screen.findByText("Couldn't save your comment. Try again.");

            await user.click(screen.getByRole("button", { name: "Save comment" }));

            await waitFor(() =>
                expect(screen.queryByText("Couldn't save your comment. Try again.")).not.toBeInTheDocument()
            );
            expect(screen.getByRole("button", { name: "Comment · 1" })).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    // Known bug in the component, written down as a reminder.
    // LikedFactCard does `fact.likedBy.length`, which crashes for a fact that
    // you commented on but that has NO `likedBy` field in Firestore.
    // Fix: use `(fact.likedBy ?? []).length`, then turn this into a real test.
    it.todo("does not crash for a commented fact that has no likedBy field");
});
