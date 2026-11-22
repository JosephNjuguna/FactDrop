import { useState, useEffect } from "react";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

function TrendingFacts({ userEmail }) {
    const [facts, setFacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recentlyChangedFactIds, setRecentlyChangedFactIds] = useState([]);

    useEffect(() => {
        const stopListening = onSnapshot(
            collection(db, "facts"),
            (snapshot) => {
                const changedFactIds = snapshot
                    .docChanges()
                    .filter(
                        (change) =>
                            change.type === "modified" && !change.doc.metadata.hasPendingWrites
                    )
                    .map((change) => change.doc.id);

                const latestFacts = snapshot.docs.map((factDoc) => ({
                    id: factDoc.id,
                    ...factDoc.data(),
                    likedBy: factDoc.data().likedBy ?? [],
                    comments: factDoc.data().comments ?? [],
                }));

                latestFacts.sort((firstFact, secondFact) => {
                    const likeDifference =
                        secondFact.likedBy.length - firstFact.likedBy.length;
                    if (likeDifference !== 0) return likeDifference;
                    return firstFact.id.localeCompare(secondFact.id);
                });

                setFacts(latestFacts);

                if (changedFactIds.length > 0) {
                    setRecentlyChangedFactIds((currentIds) => [
                        ...currentIds,
                        ...changedFactIds,
                    ]);
                    setTimeout(() => {
                        setRecentlyChangedFactIds((currentIds) =>
                            currentIds.filter((currentId) => !changedFactIds.includes(currentId))
                        );
                    }, 2000);
                }

                setLoading(false);
            },
            (err) => {
                console.error(err);
                setError("Couldn't load facts.");
                setLoading(false);
            }
        );

        return stopListening;
    }, []);

    async function handleLike(fact) {
        const alreadyLiked = fact.likedBy.includes(userEmail);
        setError(null);

        try {
            await updateDoc(doc(db, "facts", String(fact.id)), {
                likedBy: alreadyLiked ? arrayRemove(userEmail) : arrayUnion(userEmail),
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error(err);
            setError("Couldn't save your like. Try again.");
        }
    }

    if (loading) return <p className="text-gray-500">Loading...</p>;

    return (
        <div className="space-y-4">
            {error && <p className="text-red-500">{error}</p>}

            {facts.map((fact) => (
                <TrendingFactCard
                    key={fact.id}
                    fact={fact}
                    userEmail={userEmail}
                    justChanged={recentlyChangedFactIds.includes(fact.id)}
                    onLike={handleLike}
                />
            ))}
        </div>
    );
}

// Each card has its own comment state, so opening one doesn't open the others
function TrendingFactCard({ fact, userEmail, justChanged, onLike }) {
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [newCommentText, setNewCommentText] = useState("");
    const [commentError, setCommentError] = useState(null);

    const userHasLiked = fact.likedBy.includes(userEmail);

    async function handleSaveComment() {
        const trimmedText = newCommentText.trim();
        if (!trimmedText) return;

        const newComment = {
            author: userEmail,
            text: trimmedText,
            createdAt: Date.now(),
        };

        setNewCommentText(""); // clear the box right away
        setCommentError(null);

        try {
            // The live listener shows the new comment immediately,
            // and Firestore undoes it automatically if the save fails
            await updateDoc(doc(db, "facts", fact.id), {
                comments: arrayUnion(newComment),
            });
        } catch (err) {
            console.error(err);
            setNewCommentText(trimmedText); // give the text back so it isn't lost
            setCommentError("Couldn't save your comment. Try again.");
        }
    }

    return (
        <div className={` shadow-lg rounded-2xl border border-pink-300 p-4 m-5 transition-colors ${justChanged ? "bg-yellow-100" : ""}`}>
            <p className="text-sm text-gray-500">{fact.category}</p>
            <p className="font-bold">{fact.text}</p>

            <div className="mt-3 flex justify-end gap-2">
                <button
                    onClick={() => onLike(fact)}
                    className={`rounded-full border px-4 py-1 text-sm ${userHasLiked ? "bg-red-500 text-white" : "bg-white"
                        }`}
                >
                    {userHasLiked ? "Unlike" : "Like"} · {fact.likedBy.length}
                </button>

                <button
                    onClick={() => setCommentsOpen(!commentsOpen)}
                    className="rounded-full bg-red-500 px-4 py-1 text-sm text-white"
                >
                    Comment · {fact.comments.length}
                </button>
            </div>

            {commentsOpen && (
                <div className="mt-3 border-t pt-3">
                    {/* Fixed height, scrolls when there are many comments */}
                    <div className="h-40 space-y-2 overflow-y-auto">
                        {fact.comments.length === 0 && (
                            <p className="text-sm text-gray-500">No comments yet.</p>
                        )}
                        {fact.comments.map((comment) => (
                            <div
                                key={comment.createdAt}
                                className="rounded bg-slate-800 px-3 py-2 text-sm text-white"
                            >
                                <span className="font-bold">{comment.author}</span> {comment.text}
                            </div>
                        ))}
                    </div>

                    {/* Outside the scroll area, so it stays fixed in view */}
                    <textarea
                        value={newCommentText}
                        onChange={(event) => setNewCommentText(event.target.value)}
                        placeholder="Enter comment..."
                        className="mt-3 w-full rounded border p-2"
                        rows={2}
                    />
                    {commentError && <p className="text-sm text-red-500">{commentError}</p>}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveComment}
                            className="rounded bg-blue-600 px-4 py-1 text-white"
                        >
                            Save comment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TrendingFacts;