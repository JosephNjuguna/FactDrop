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
    return { id: data.fact.id, text: data.fact.text, category: data.fact.category };
}

const TABS = [
    { id: "facts", label: "Facts For You" },
    { id: "trending", label: "Trending Facts" },
    { id: "liked", label: "Facts You Liked" },
    { id: "profile", label: "Profile Stats" },
];

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
        fetchfacts()
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

    const [activeTab, setActiveTab] = useState("facts");
    return (
        <>
            <main>
                <div className="center">

                    <div className="factsNav">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 border-b-2 ${activeTab === tab.id
                                        ? "border-red-500 text-red-500 font-bold"
                                        : "border-transparent text-gray-500 hover:text-black"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {activeTab === "facts" && (
                        <Facts facts={facts} updatelikedCard={handleLiked} userEmail={userEmail} factsError={factsError}/>
                    )}
                    {activeTab === "trending" && <TrendingFacts userEmail={userEmail}/>}
                    {activeTab === "liked" && <FactsYouLiked userEmail={userEmail}/>}
                    {activeTab === "profile" && <Profile userEmail={userEmail}/>}
                </div>

            </main>

        </>
    )
}
export default Home;