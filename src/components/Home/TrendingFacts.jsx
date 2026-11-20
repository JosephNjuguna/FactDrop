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
        // i know firebase usually has a realtime update feature
        // so we can use that to get realtime updates 
        // of what happens in the db.
        const stopListening = onSnapshot(
            collection(db, "facts"),
            (snapshot) => {
                const changedFactIds = snapshot
                    .docChanges()
                    .filter((change) =>change.type === "modified" && !change.doc.metadata.hasPendingWrites)
                    .map((change) => change.doc.id);

                const latestFacts = snapshot.docs.map((factDoc) => ({
                    id: factDoc.id,
                    ...factDoc.data(),
                    likedBy: factDoc.data().likedBy ?? [],
                }));

                latestFacts.sort((firstFact, secondFact) => {
                    const likeDifference = secondFact.likedBy.length - firstFact.likedBy.length;
                    if (likeDifference !== 0) return likeDifference;
                    return firstFact.id.localeCompare(secondFact.id);
                });

                setFacts(latestFacts);

                if (changedFactIds.length > 0) {
                    // check if there are new updates then then 
                    // update the state with the new data.
                    setRecentlyChangedFactIds((currentIds) => [ ...currentIds, ...changedFactIds,]);
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

    async function handleLike(fact) {//called when user clicks like button
        const alreadyLiked = fact.likedBy.includes(userEmail);
        setError(null);

        try {//try catch errors
            await updateDoc(doc(db, "facts", String(fact.id)), {
                //firebase update the doc
                // if user has already liked & they clcik like button again
                // that action unlikes the fact and removes user email from the array
                // we al.
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

            {facts.map((fact) => {
                const userHasLiked = fact.likedBy.includes(userEmail);
                const justChanged = recentlyChangedFactIds.includes(fact.id);

                return (
                    <div
                        key={fact.id}
                        className={`rounded border p-4 transition-colors ${justChanged ? "bg-yellow-100" : ""
                            }`}
                    >
                        <p className="text-sm text-gray-500">{fact.category}</p>
                        <p>{fact.text}</p>
                        <button
                            onClick={() => handleLike(fact)}
                            className={`mt-2 rounded px-3 py-1 ${userHasLiked ? "bg-red-500 text-white" : "bg-gray-200"
                                }`}
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