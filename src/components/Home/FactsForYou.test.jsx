import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { doc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";

// If your file is called Facts.jsx (Home imports "./Home/Facts"), change this line.
import Facts from "./FactsForYou";

// =====================================================================
// MOCKS (paths must match the imports inside FactsForYou.jsx)
// =====================================================================

vi.mock("firebase/firestore", () => ({
    doc: vi.fn(),
    setDoc: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    serverTimestamp: vi.fn(),
}));

vi.mock("../../firebase", () => ({
    db: { name: "fake-db" },
}));

// =====================================================================
// HELPERS
// =====================================================================

const ME = "me@example.com";

const honey = { id: 1, text: "Honey never spoils", category: "food", likedBy: [] };
const octopus = { id: 2, text: "Octopuses have three hearts", category: "animals", likedBy: ["other@example.com"] };

// Renders <Facts /> with sensible defaults. Anything you pass overrides them.
// Returns the final props so tests can inspect the fake callback.
function renderFacts(props = {}) {
    const finalProps = {
        facts: [],
        updatelikedCard: vi.fn(),
        userEmail: ME,
        factsError: "",
        ...props,
    };
    render(<Facts {...finalProps} />);
    return finalProps;
}

const getLikeButton = () => screen.getByRole("button", { name: "like fact" });
const getLikedButton = () => screen.getByRole("button", { name: "liked" });

// =====================================================================
// TESTS
// =====================================================================

describe("Facts (Facts For You tab)", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        doc.mockReturnValue("FACT_REF");
        serverTimestamp.mockReturnValue("SERVER_TIME");
        // Fake "special values": plain objects we can compare in assertions.
        arrayUnion.mockImplementation((value) => ({ op: "union", value }));
        arrayRemove.mockImplementation((value) => ({ op: "remove", value }));
        setDoc.mockResolvedValue(undefined);

        vi.spyOn(console, "error").mockImplementation(() => { });
    });

    // ---------------------------------------------------------------
    describe("rendering", () => {
        it("shows the text and category of every fact", () => {
            renderFacts({ facts: [honey, octopus] });

            expect(screen.getByText("Honey never spoils")).toBeInTheDocument();
            expect(screen.getByText("food")).toBeInTheDocument();
            expect(screen.getByText("Octopuses have three hearts")).toBeInTheDocument();
            expect(screen.getByText("animals")).toBeInTheDocument();
        });

        it("renders one button per fact", () => {
            renderFacts({ facts: [honey, octopus] });
            expect(screen.getAllByRole("button")).toHaveLength(2);
        });

        it("renders no cards when the list is empty", () => {
            renderFacts({ facts: [] });
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("shows the error message passed in factsError", () => {
            renderFacts({ factsError: "Fetching Facts failed." });
            expect(screen.getByText("Fetching Facts failed.")).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("initial like state", () => {
        it("shows 'like fact' when the user has not liked it", () => {
            renderFacts({ facts: [octopus] }); // liked by someone else only
            expect(getLikeButton()).toBeInTheDocument();
        });

        it("shows 'liked' when the user's email is in likedBy", () => {
            renderFacts({ facts: [{ ...octopus, likedBy: [ME] }] });
            expect(getLikedButton()).toBeInTheDocument();
        });

        it("treats a fact with no likedBy field as not liked", () => {
            const { likedBy, ...factWithoutLikedBy } = honey;
            renderFacts({ facts: [factWithoutLikedBy] });
            expect(getLikeButton()).toBeInTheDocument();
        });
    });

    // ---------------------------------------------------------------
    describe("liking a fact", () => {
        it("changes the button to 'liked' immediately", async () => {
            const user = userEvent.setup();
            renderFacts({ facts: [honey] });

            await user.click(getLikeButton());

            expect(getLikedButton()).toBeInTheDocument();
        });

        it("saves to Firestore with arrayUnion and merge: true", async () => {
            const user = userEvent.setup();
            renderFacts({ facts: [honey] });

            await user.click(getLikeButton());

            expect(doc).toHaveBeenCalledWith({ name: "fake-db" }, "facts", "1"); // id becomes a string
            expect(setDoc).toHaveBeenCalledTimes(1);
            expect(setDoc).toHaveBeenCalledWith(
                "FACT_REF",
                {
                    text: "Honey never spoils",
                    category: "food",
                    likedBy: { op: "union", value: ME },
                    updatedAt: "SERVER_TIME",
                },
                { merge: true }
            );
        });

        it("tells the parent (onLiked) which fact was liked", async () => {
            const user = userEvent.setup();
            const { updatelikedCard } = renderFacts({ facts: [honey] });

            await user.click(getLikeButton());

            expect(updatelikedCard).toHaveBeenCalledTimes(1);
            expect(updatelikedCard).toHaveBeenCalledWith(1);
        });

        it("calls onLiked right away, before the save has finished", async () => {
            let resolveSave;
            setDoc.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
            const user = userEvent.setup();
            const { updatelikedCard } = renderFacts({ facts: [honey] });

            await user.click(getLikeButton());

            expect(updatelikedCard).toHaveBeenCalledWith(1); // save is still pending here

            await act(async () => { resolveSave(); });
        });

        it("does not crash when no onLiked callback is provided", async () => {
            const user = userEvent.setup();
            renderFacts({ facts: [honey], updatelikedCard: undefined });

            await user.click(getLikeButton());

            expect(getLikedButton()).toBeInTheDocument();
            expect(setDoc).toHaveBeenCalledTimes(1);
        });

        it("ignores extra clicks while a save is in progress", async () => {
            let resolveSave;
            setDoc.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
            const user = userEvent.setup();
            renderFacts({ facts: [honey] });

            const button = getLikeButton(); // keep a reference to the same DOM element
            await user.click(button);
            await user.click(button);
            await user.click(button);

            expect(setDoc).toHaveBeenCalledTimes(1);

            await act(async () => { resolveSave(); });
            expect(getLikedButton()).toBeInTheDocument();
        });

        it("only changes the card that was clicked", async () => {
            const user = userEvent.setup();
            renderFacts({ facts: [honey, { ...octopus, likedBy: [] }] });

            await user.click(screen.getAllByRole("button", { name: "like fact" })[0]);

            expect(screen.getAllByRole("button", { name: "liked" })).toHaveLength(1);
            expect(screen.getAllByRole("button", { name: "like fact" })).toHaveLength(1);
        });
    });

    // ---------------------------------------------------------------
    describe("unliking a fact", () => {
        const likedFact = { ...honey, likedBy: [ME] };

        it("changes the button back to 'like fact'", async () => {
            const user = userEvent.setup();
            renderFacts({ facts: [likedFact] });

            await user.click(getLikedButton());

            expect(getLikeButton()).toBeInTheDocument();
        });

        it("saves with arrayRemove", async () => {
            const user = userEvent.setup();
            renderFacts({ facts: [likedFact] });

            await user.click(getLikedButton());

            expect(setDoc).toHaveBeenCalledWith(
                "FACT_REF",
                expect.objectContaining({ likedBy: { op: "remove", value: ME } }),
                { merge: true }
            );
        });

        it("does NOT call onLiked (only liking removes the card from the list)", async () => {
            const user = userEvent.setup();
            const { updatelikedCard } = renderFacts({ facts: [likedFact] });

            await user.click(getLikedButton());

            expect(updatelikedCard).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    describe("when saving fails", () => {
        it("undoes the like and shows an error", async () => {
            setDoc.mockRejectedValue(new Error("network down"));
            const user = userEvent.setup();
            renderFacts({ facts: [honey] });

            await user.click(getLikeButton());

            expect(await screen.findByText("Couldn't save your like. Try again.")).toBeInTheDocument();
            expect(getLikeButton()).toBeInTheDocument(); // back to un-liked
        });

        it("undoes an unlike and restores 'liked'", async () => {
            setDoc.mockRejectedValue(new Error("network down"));
            const user = userEvent.setup();
            renderFacts({ facts: [{ ...honey, likedBy: [ME] }] });

            await user.click(getLikedButton());

            expect(await screen.findByText("Couldn't save your like. Try again.")).toBeInTheDocument();
            expect(getLikedButton()).toBeInTheDocument();
        });

        it("lets the user try again, and clears the old error", async () => {
            setDoc
                .mockRejectedValueOnce(new Error("network down"))
                .mockResolvedValueOnce(undefined);
            const user = userEvent.setup();
            renderFacts({ facts: [honey] });

            await user.click(getLikeButton());
            await screen.findByText("Couldn't save your like. Try again.");

            await user.click(getLikeButton());

            expect(screen.queryByText("Couldn't save your like. Try again.")).not.toBeInTheDocument();
            expect(getLikedButton()).toBeInTheDocument();
            expect(setDoc).toHaveBeenCalledTimes(2);
        });
    });
});
