import { useEffect, useState } from "react";
import { useAuth } from "../components/Helpers/AuthContext";
import '../css/facts.css';

import Facts from "./Home/Facts";
import FactsYouLiked from "./Home/FactsYouLiked";
import Profile from "./Home/Profile";
import TrendingFacts from "./Home/TrendingFacts";


async function fetchRandomFact() {
    const res = await fetch("https://factfacts.com/api.php?count=1");
    if (!res.ok) {
        throw new Error("Failed to fetch fact");
    }
    const data = await res.json();

    // Map the API's shape to what FactCard expects
    return { id: data.fact.id, text: data.fact.text, category: data.fact.category };
}

function Home() {
    const { user } = useAuth();
    const userEmail = user.email;


    const [facts, setFacts] = useState([]);
    const [factsError, setFactsError] = useState("");

    useEffect(() => {
        const fetchfacts = async () => {
            await fetch('https://factfacts.com/api.php?count=5')
                .then((res) => {
                    if (!res.ok) {
                        setFactsError('Failed to fetch facts data')
                        throw new Error();
                    }
                    return res.json();
                })
                .then((data) => {
                    setFacts(data.facts);
                    console.log(data.facts);
                })
                .catch((err) => {
                    setFactsError('Fetching Facts failed.')
                    console.log(err.message);
                });
        }
        // fetchfacts()
    }, []);

    async function handleLiked(id) {
        setFacts((prev) => prev.filter((f) => f.id !== id));//filter out like fact from the ui.
        try {
            const next = await fetchRandomFact();
            setFacts((prev) =>
                prev.some((f) => f.id === next.id) ? prev : [...prev, next]
            );
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <>
            <main>
                <div className="center">
                    <div className="factsNav">
                        <button>Facts For You</button>
                        <button>Trending Facts</button>
                        <button>Facts You Liked</button>
                        <button>Profile Stats</button>
                    </div>
                    <Facts facts={facts} updatelikedCard={handleLiked} userEmail={userEmail} />
                    <TrendingFacts/>
                    <FactsYouLiked/>
                    <Profile/>
                </div>

            </main>

        </>
    )
}
export default Home;