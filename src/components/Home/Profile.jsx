import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";

import "../../css/profile.css";

function Profile({ userEmail }) {
    if (!userEmail) return; // to ensure the user email is alwaysavailable

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
        return <p className="profile-status">Loading...</p>;
    }
    if (error) {
        return <p className="profile-error">{error}</p>;
    }

    async function handleSignOut() {
        await signOut(auth);
        navigate("/");
    }

    return (
        <div className="profile" >
            <p className="profile-label">Signed in as</p>
            <p className="profile-email">{userEmail}</p>

            <div className="profile-stats">
                <div className="profile-stat">
                    <p className="profile-stat-number">{likedFacts.length}</p>
                    <p className="profile-stat-label">Liked facts</p>
                </div>

                <div className="profile-stat">
                    <p className="profile-stat-number">{totalComments}</p>
                    <p className="profile-stat-label">Comments</p>
                </div>
            </div>

            <button className="profile-signout" onClick={handleSignOut}>
                Sign out
            </button>
        </div>
    );

}
export default Profile;