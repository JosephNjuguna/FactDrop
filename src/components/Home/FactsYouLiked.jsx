import { useState, useEffect } from "react";
import { collection,getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase";

function FactsYouLiked({ userEmail }) {
    const [facts, setFacts] = useState([]); // facts the user liked OR commented on
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userEmail) return; // wait until auth gives us an email

        const loadFacts = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, "facts"));

                const myFacts = snapshot.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((fact) => {
                        const liked = (fact.likedBy ?? []).includes(userEmail);
                        const commented = (fact.comments ?? []).some(
                            (c) => c.author === userEmail
                        );
                        return liked || commented;
                    });

                setFacts(myFacts);
            } catch (err) {
                console.error(err);
                setError("Couldn't load your facts.");
            } finally {
                setLoading(false);
            }
        };
        loadFacts();
    }, [userEmail]);

    if (loading) {
        return <p className="text-gray-500">Loading...</p>;
    }
    if (error) {
        return <p className="text-red-500">{error}</p>;
    }
    if (facts.length === 0) {
        return (
            <p className="text-gray-500">
                You haven't liked or commented on any facts yet.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {facts.map((fact) => (
                <LikedFactCard key={fact.id} fact={fact} userEmail={userEmail} />
            ))}
        </div>
    );
}
function LikedFactCard({ fact, userEmail }) {
    const [comments, setComments] = useState(fact.comments ?? []);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [newCommentText, setNewCommentText] = useState("");
    const [commentError, setCommentError] = useState(null);

    async function handleSaveComment() {
        const trimmedText = newCommentText.trim();//remove any spaces
        if (!trimmedText) return;//if there is nothing then return

        const newComment = {
            author: userEmail,
            text: trimmedText,
            createdAt: Date.now(),
        };
        const commentsBeforeSaving = comments;

        //update UI immediately
        setComments([...comments, newComment]);
        setNewCommentText("");
        setCommentError(null);

        try {
            //then save to the database
            await updateDoc(doc(db, "facts", fact.id), {
                comments: arrayUnion(newComment),
            });
        } catch (err) {
            console.error(err);
            //undo if saving failed
            setComments(commentsBeforeSaving);
            setNewCommentText(trimmedText);
            setCommentError("Couldn't save your comment. Try again.");
        }
    }

    return (
        <div className="rounded-2xl border border-pink-300 p-4 m-5 shadow-lg">
            <p className="text-sm text-gray-500">{fact.category}</p>
            <p className="font-bold">{fact.text}</p>

            <div className="mt-3 flex justify-end gap-2">
                <span className="rounded-full border px-4 py-1 text-sm">
                    Likes · {(fact.likedBy ?? []).length}
                </span>
                <button
                    onClick={() => setCommentsOpen(!commentsOpen)}
                    className="rounded-full bg-red-500 px-4 py-1 text-sm text-white"
                >
                    Comment · {comments.length}
                </button>
            </div>

            {commentsOpen && (
                <div className="mt-3 border-t pt-3">
                    {/* Fixed heightso it scrolls when there are many comments */}
                    <div className="h-40 space-y-2 overflow-y-auto">
                        {comments.length === 0 && (
                            <p className="text-sm text-gray-500">No comments yet.</p>
                        )}
                        {comments.map((comment) => (
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

export default FactsYouLiked;