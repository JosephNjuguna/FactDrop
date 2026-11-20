import { useState, useEffect } from "react";
import {
    collection,
    getDocs,
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
    const [savingFactIds, setSavingFactIds] = useState([]);

    useEffect(() => {
        const loadFacts = async () => {
            try {
                const snapshot = await getDocs(collection(db, "facts"));
                const loadedFacts = snapshot.docs.map((factDoc) => ({
                    id: factDoc.id,
                    ...factDoc.data(),
                    likedBy: factDoc.data().likedBy ?? [],
                }));
                loadedFacts.sort((firstFact, secondFact) => secondFact.likedBy.length - firstFact.likedBy.length);
                setFacts(loadedFacts);
            } catch (err) {
                setError("Couldn't load facts.");
            } finally {
                setLoading(false);
            }
        };
        loadFacts();
    }, []);

    const updateLikedBy = (factId, newLikedBy) => {
        setFacts((currentFacts) =>
            currentFacts.map((currentFact) => currentFact.id === factId ? { ...currentFact, likedBy: newLikedBy } : currentFact)
        );
    };

    async function handleLike(fact) {
        if (savingFactIds.includes(fact.id)) {
            return;
        }

        const previousLikedBy = fact.likedBy;
        const alreadyLiked = previousLikedBy.includes(userEmail);
        const newLikedBy = alreadyLiked ? previousLikedBy.filter((likerEmail) => likerEmail !== userEmail) : [...previousLikedBy, userEmail];

        setError(null);
        updateLikedBy(fact.id, newLikedBy);
        setSavingFactIds((currentIds) => [...currentIds, fact.id]);

        try {
            await updateDoc(doc(db, "facts", String(fact.id)), { likedBy: alreadyLiked ? arrayRemove(userEmail) : arrayUnion(userEmail), updatedAt: serverTimestamp() });
        } catch (err) {
            console.error(err);
            updateLikedBy(fact.id, previousLikedBy);
            setError("Couldn't save your like. Try again.");
        } finally {
            setSavingFactIds((currentIds) =>
                currentIds.filter((savingId) => savingId !== fact.id)
            );
        }
    }

    if (loading) return <p className="text-gray-500">Loading...</p>;

    return (
        <div className="space-y-4">
            {error && <p className="text-red-500">{error}</p>}
            {facts.map((fact) => {
                const userHasLiked = fact.likedBy.includes(userEmail);
                return (
                    <div key={fact.id} className="rounded border p-4">
                        <p className="text-sm text-gray-500">{fact.category}</p>
                        <p>{fact.text}</p>
                        <button
                            onClick={() => handleLike(fact)}
                            className={`mt-2 rounded px-3 py-1 ${userHasLiked ? "bg-red-500 text-white" : "bg-gray-200"}`}
                        >
                            {userHasLiked ? "Unlike" : "Like"} · {fact.likedBy.length}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export default TrendingFacts;