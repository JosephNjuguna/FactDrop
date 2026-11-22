import { useState } from "react";
import { doc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

function Facts({ facts, updatelikedCard,  userEmail, factsError }) {
    return (
        <div className="FactsList">
            <ul className="Facts">
                {facts.map((fact) => (
                    <FactCard key={fact.id} fact={fact} onLiked={updatelikedCard} userEmail={userEmail}/>
                ))}
            </ul>
            <p>{factsError}</p>
        </div>
    );
}

function FactCard({ fact, userEmail, onLiked }) {
    const initialLikedBy = fact.likedBy ?? [];

    const [userHasLiked, setUserHasLiked] = useState(
        initialLikedBy.includes(userEmail)
    );
    const [likeCount, setLikeCount] = useState(initialLikedBy.length);
    const [isSaving, setIsSaving] = useState(false); // stops double-click spam
    const [error, setError] = useState(null);

    async function handleLike() {
        if (isSaving) return;

        const hadLikedBefore = userHasLiked;
        const likeCountBefore = likeCount;
        const willBeLiked = !hadLikedBefore;

        setUserHasLiked(willBeLiked);
        setLikeCount(willBeLiked ? likeCountBefore + 1 : likeCountBefore - 1);
        setIsSaving(true);
        setError(null);
        if (willBeLiked) onLiked?.(fact.id);

        try {
            await setDoc(
                doc(db, "facts", String(fact.id)),
                {
                    text: fact.text,
                    category: fact.category,
                    likedBy: willBeLiked ? arrayUnion(userEmail) : arrayRemove(userEmail),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (err) {
            console.error(err);
            setUserHasLiked(hadLikedBefore);
            setLikeCount(likeCountBefore);
            setError("Couldn't save your like. Try again.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="rounded-2xl border border-pink-300 p-4 m-5 shadow-lg">
            <p className="text-sm text-gray-500">{fact.category}</p>
            <p className="font-bold">{fact.text}</p>

            <div className="mt-3 flex items-center justify-end gap-2">
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                    onClick={handleLike}
                    className={`rounded-full border px-4 py-1 text-sm ${userHasLiked ? "bg-red-500 text-white" : "bg-white"
                        }`}
                >
                    {userHasLiked ? "liked" : "like fact"}
                </button>
            </div>
        </div>
    );
}

export default Facts