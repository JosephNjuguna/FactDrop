import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";

function Profile({ userEmail }) {
    if (!userEmail) return; // wait until auth gives us an email

    const navigate = useNavigate();
    const [likedFacts, setLikedFacts] = useState([]);
    const [commentedFacts, setCommentedFacts] = useState([]); // facts the user commented on
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadFacts = async () => {
            try {
                const likedQuery = query(
                    collection(db, "facts"),
                    where("likedBy", "array-contains", userEmail)
                );

                // Run both reads at the same time
                const [likedSnap, allSnap] = await Promise.all([
                    getDocs(likedQuery),
                    getDocs(collection(db, "facts")),
                ]);

                setLikedFacts(
                    likedSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
                );



                const commented = allSnap.docs
                    .map((d) => ({ id: d.id, ...d.data() }))
                    .filter((fact) =>
                        (fact.comments || []).some((c) => c.author === userEmail)
                    )
                    .map((fact) => ({
                        ...fact,
                        // only this user's comments, handy for display and counting
                        myComments: fact.comments.filter((c) => c.author === userEmail),
                    }));

                setCommentedFacts(commented);
            } catch (err) {
                console.error(err);
                setError("Couldn't load your facts.");
            } finally {
                setLoading(false);
            }
        };
        loadFacts();
    }, [userEmail]);

    // total number of comments the user has written across all facts
    const totalComments = commentedFacts.reduce(
        (sum, fact) => sum + fact.myComments.length,
        0
    );

    if (loading) {
        return <p className="text-gray-500">Loading...</p>;
    }
    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    async function handleSignOut() {
        await signOut(auth);
        navigate("/");
    }

    return (
        <div className="space-y-4">

            <p>signed in as: </p>
            <p>{userEmail}</p>

            <hr />
            <p>{likedFacts.length}</p>
            <p>liked facts</p>

            <hr />
            <p>{commentedFacts.length}</p>
            <p>facts commented</p>

            <hr />
            <p>{totalComments}</p>
            <p>total comments</p>

            <button onClick={handleSignOut}>Sign Out</button>

        </div>
    );

}
export default Profile;