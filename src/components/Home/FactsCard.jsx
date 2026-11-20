import { useState } from "react";
import { doc, setDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

function FactCard({ fact, userEmail, onLiked }) {
    const [isLiking, setIsLiking] = useState(false);//stop user from double clicking :  tracking state.
    const [error, setError] = useState(null);

    async function handleLikes(factid) {
        if (isLiking) return;
        setIsLiking(true);
        setError(null);

        try {
            const factRef = doc(db, "facts", String(factid));
            await setDoc(
                factRef,
                {
                    text: fact.text,
                    category: fact.category,
                    likedBy: arrayUnion(userEmail),
                    comments: [],
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            onLiked(factid);
            console.log(factid);
            
        } catch (err) {
            console.error(err);
            setError("Couldn't save your like. Try again.");
            setIsLiking(false);
        }
    }

    return (
        <div>
            <p>category: {fact.category}</p>
            <p>fact: {fact.text}</p>
            <button onClick={()=>handleLikes(fact.id)} disabled={isLiking}>
                {isLiking ? "saving..." : "like"}
            </button>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
}

export default FactCard;